import { Request, Response } from "express";
import { IsNull } from "typeorm";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { AppDataSource } from "../ormconfig";
import { Account } from "../entity/account";
import { User } from "../entity/User";
import { Vehicles } from "../entity/vehicle";
import { Devices } from "../entity/device";
import { Driver } from "../entity/driver";
import { createVehicleForCustomer, getVehiclesForCustomer } from "./vehicleController";

const accountRepo = () => AppDataSource.getRepository(Account);
const userRepo = () => AppDataSource.getRepository(User);
const vehicleRepo = () => AppDataSource.getRepository(Vehicles);
const deviceRepo = () => AppDataSource.getRepository(Devices);
const driverRepo = () => AppDataSource.getRepository(Driver);

const VALID_TIERS = new Set(["Basic", "Pro", "Enterprise"]);

// URL-safe 12-char password from 9 random bytes. Stage 3e: shown ONCE in
// the create-customer response; admin shares with end user out-of-band.
const generatePassword = (): string => {
  return crypto.randomBytes(9).toString("base64").replace(/[+/=]/g, "x").slice(0, 12);
};

// Re-export so customerRouter can mount these nested.
export { createVehicleForCustomer, getVehiclesForCustomer };

// POST /api/customers
export const createCustomer = async (req: Request, res: Response) => {
  try {
    const {
      company_name, owner_name, email, phone,
      pricing_tier, billing_email, billing_contact_name,
      address_line1, address_line2, city, state, postal_code, country,
    } = req.body ?? {};
    if (!company_name) return res.status(400).json({ message: "company_name is required" });
    if (!owner_name) return res.status(400).json({ message: "owner_name is required" });
    if (!email) return res.status(400).json({ message: "email is required" });
    if (!phone) return res.status(400).json({ message: "phone is required" });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ message: "email must be a valid address" });
    }
    if (pricing_tier && !VALID_TIERS.has(pricing_tier)) {
      return res.status(400).json({ message: `pricing_tier must be one of ${[...VALID_TIERS].join(", ")}` });
    }

    // Pre-check uniqueness on email — the unique index will also enforce
    // but the friendlier 400 surfaces here.
    const dupe = await accountRepo()
      .createQueryBuilder("a")
      .where("LOWER(a.email) = LOWER(:e)", { e: email })
      .andWhere("a.deleted_at IS NULL")
      .getOne();
    if (dupe) return res.status(400).json({ message: "A customer with this email already exists" });

    // Stage 3e cleanup: legacy v1 columns made nullable in migration
    // 1779500000000. Only `title` is still populated (mirrors company_name)
    // so the existing legacy login page renders something. Drop title +
    // remaining v1 columns in Stage 4 once we confirm no readers.
    const a = accountRepo().create({
      title: company_name,
      statusID: 1,
      email, phone, owner_name, company_name,
      pricing_tier: pricing_tier ?? "Basic",
      billing_email: billing_email ?? null,
      billing_contact_name: billing_contact_name ?? null,
      address_line1: address_line1 ?? null,
      address_line2: address_line2 ?? null,
      city: city ?? null, state: state ?? null,
      postal_code: postal_code ?? null, country: country ?? null,
      deleted_at: null,
    } as any);
    const savedAccount = (await accountRepo().save(a)) as unknown as Account;

    // Auto-create the CUSTOMER_ADMIN user.
    const plain = generatePassword();
    const hash = await bcrypt.hash(plain, 12);
    // The legacy `users` table has many v1 columns that are still NOT NULL
    // on production (we only loosened `accounts`). Keep filling the bare
    // minimum until Stage 4 also nullable-fies `users`.
    const u = userRepo().create({
      customerID: Number(savedAccount.ID),
      username: email.slice(0, 20),
      fname: owner_name,
      email,
      mobileno: phone ?? "",
      userTY: "CA",
      password_hash: hash,
      role: "CUSTOMER_ADMIN",
    } as any);
    const savedUser = (await userRepo().save(u)) as unknown as User;

    res.status(201).json({
      customer: savedAccount,
      admin_user: { id: savedUser.ID, email: savedUser.email, role: "CUSTOMER_ADMIN" },
      generated_password: plain, // Shown ONCE — admin shares manually
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to create customer", error: error?.message });
  }
};

// GET /api/customers
export const listCustomers = async (_req: Request, res: Response) => {
  try {
    const rows = await accountRepo()
      .createQueryBuilder("a")
      .where("a.deleted_at IS NULL")
      .andWhere("a.email IS NOT NULL") // Stage 3e: only customers created via the new flow
      .orderBy('a."ID"', "DESC")
      .getMany();
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to list customers", error: error?.message });
  }
};

// GET /api/customers/:id  (with counts)
export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    const c = await accountRepo().findOne({ where: { ID: Number(id), deleted_at: IsNull() } as any });
    if (!c) return res.status(404).json({ message: "Customer not found" });
    const [vehiclesCount, gatewaysCount, driversCount, usersCount] = await Promise.all([
      vehicleRepo().count({ where: { account_id: id, deleted_at: IsNull() } }),
      deviceRepo().count({ where: { account_id: id, deleted_at: IsNull() } }),
      driverRepo().count({ where: { account_id: id, deleted_at: IsNull() } }),
      userRepo().count({ where: { customerID: Number(id), deleted_at: IsNull() } as any }),
    ]);
    res.json({ ...c, counts: { vehicles: vehiclesCount, gateways: gatewaysCount, drivers: driversCount, users: usersCount } });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch customer", error: error?.message });
  }
};

// PUT /api/customers/:id
export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    const c = await accountRepo().findOne({ where: { ID: Number(id), deleted_at: IsNull() } as any });
    if (!c) return res.status(404).json({ message: "Customer not found" });
    const allowed = ["email","phone","owner_name","company_name","pricing_tier",
      "billing_email","billing_contact_name","address_line1","address_line2","city","state","postal_code","country"];
    for (const k of allowed) {
      if (k in req.body) (c as any)[k] = req.body[k];
    }
    if (req.body.pricing_tier && !VALID_TIERS.has(req.body.pricing_tier)) {
      return res.status(400).json({ message: `pricing_tier must be one of ${[...VALID_TIERS].join(", ")}` });
    }
    const saved = await accountRepo().save(c);
    res.json(saved);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update customer", error: error?.message });
  }
};

// DELETE /api/customers/:id  (soft)
export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    const r = await accountRepo().update({ ID: Number(id) } as any, { deleted_at: new Date() } as any);
    if (r.affected === 0) return res.status(404).json({ message: "Customer not found" });
    res.json({ message: "Customer soft-deleted" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete customer", error: error?.message });
  }
};

// === Users on a customer ===

// POST /api/users  body: { account_id, email, name, role? }
export const createUser = async (req: Request, res: Response) => {
  try {
    const { account_id, email, name, role } = req.body ?? {};
    if (!account_id || !/^\d+$/.test(String(account_id))) return res.status(400).json({ message: "account_id is required" });
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ message: "valid email is required" });
    if (!name) return res.status(400).json({ message: "name is required" });
    const finalRole = role ?? "CUSTOMER_ADMIN";
    if (!["GEOTRENZA_ADMIN", "CUSTOMER_ADMIN"].includes(finalRole)) {
      return res.status(400).json({ message: "role must be GEOTRENZA_ADMIN or CUSTOMER_ADMIN" });
    }
    const plain = generatePassword();
    const hash = await bcrypt.hash(plain, 12);
    const u = userRepo().create({
      customerID: Number(account_id),
      username: email.slice(0, 20),
      fname: name,
      email,
      userTY: finalRole === "GEOTRENZA_ADMIN" ? "AD" : "CA",
      password_hash: hash,
      role: finalRole,
    } as any);
    const saved = (await userRepo().save(u)) as unknown as User;
    res.status(201).json({ user: { id: saved.ID, email: saved.email, role: finalRole }, generated_password: plain });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to create user", error: error?.message });
  }
};

// GET /api/users?account_id=X
export const listUsers = async (req: Request, res: Response) => {
  try {
    const { account_id } = req.query;
    const qb = userRepo()
      .createQueryBuilder("u")
      .where("u.deleted_at IS NULL");
    if (account_id) qb.andWhere('u."customerID" = :a', { a: Number(account_id) });
    const rows = await qb.orderBy('u."ID"', "ASC").getMany();
    res.json(rows.map((u: any) => ({
      id: u.ID, email: u.email, name: `${u.fname ?? ""} ${u.lname ?? ""}`.trim(),
      role: u.role, last_login_at: u.last_login_at, customerID: u.customerID,
    })));
  } catch (error: any) {
    res.status(500).json({ message: "Failed to list users", error: error?.message });
  }
};

// PUT /api/users/:id  — admin can reset password (returns new plain in response)
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    const u = await userRepo().findOne({ where: { ID: Number(id), deleted_at: IsNull() } as any });
    if (!u) return res.status(404).json({ message: "User not found" });
    if ("email" in req.body) u.email = req.body.email;
    if ("name" in req.body) u.fname = req.body.name;
    let generated: string | null = null;
    if (req.body.reset_password) {
      generated = generatePassword();
      (u as any).password_hash = await bcrypt.hash(generated, 12);
    }
    const saved = await userRepo().save(u);
    res.json({ user: { id: saved.ID, email: saved.email, role: (saved as any).role }, ...(generated ? { generated_password: generated } : {}) });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update user", error: error?.message });
  }
};

// DELETE /api/users/:id  (soft)
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ message: "id must be a positive integer" });
    const r = await userRepo().update({ ID: Number(id) } as any, { deleted_at: new Date() } as any);
    if (r.affected === 0) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User soft-deleted" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete user", error: error?.message });
  }
};
