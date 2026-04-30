import { Request, Response } from "express";
import { User } from "../entity/User";
import { AppDataSource } from "../ormconfig";
import { ParsedQs } from "qs";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import md5 from "md5";
import { Account } from "../entity/account";


export class UserController {
  private userRepository = AppDataSource.getRepository(User);

  // 👉 Create User
  public async createUser(req: Request, res: Response): Promise<Response> {
    try {
      const { username, password, email } = req.body;

      if (!username || !password) {
        return res
          .status(400)
          .json({ message: "Username and password are required" });
      }

      const existingUser = await this.userRepository.findOne({
        where: { username },
      });

      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = this.userRepository.create({
        username,
        password: hashedPassword,
        email: email || null,
      });

      const savedUser = await this.userRepository.save(newUser);
      return res.status(201).json(savedUser);
    } catch (err) {
      return res.status(500).json({ message: "Error creating user", error: err });
    }
  }

  // 👉 Get All Users
  public async getUsers(req: Request, res: Response): Promise<Response> {
    try {
      const users = await this.userRepository.find();
      return res.status(200).json(users);
    } catch (err) {
      return res.status(500).json({ message: "Error fetching users", error: err });
    }
  }

  // 👉 Get User By ID
  public async getUserById(
    req: Request<{ id: string }, any, any, ParsedQs>,
    res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;

      const user = await this.userRepository.findOne({
        where: { ID: parseInt(id, 10) },
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(200).json(user);
    } catch (err) {
      return res.status(500).json({ message: "Error fetching user", error: err });
    }
  }

  // 👉 Update User
  public async updateUser(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { username, email, password } = req.body;

      const user = await this.userRepository.findOne({
        where: { ID: parseInt(id, 10) },
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (username) user.username = username;
      if (email) user.email = email;

      if (password) {
        user.password = await bcrypt.hash(password, 10);
      }

      const updatedUser = await this.userRepository.save(user);

      return res.status(200).json(updatedUser);
    } catch (err) {
      return res.status(500).json({ message: "Error updating user", error: err });
    }
  }

  // 👉 Delete User
  public async deleteUser(
    req: Request<{ id: string }, any, any, ParsedQs>,
    res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;

      const user = await this.userRepository.findOne({
        where: { ID: parseInt(id, 10) },
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await this.userRepository.remove(user);

      return res.status(200).json({ message: "User deleted successfully" });
    } catch (err) {
      return res.status(500).json({ message: "Error deleting user", error: err });
    }
  }

  // 👉 Login (supports MD5 + bcrypt)
  public async login(req: Request, res: Response): Promise<Response> {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          message: "Username and password are required",
        });
      }

      const entityManager = AppDataSource.manager;

      // =====================================================
      // STEP 1 → TRY EMPLOYEE / ADMIN LOGIN (EXISTING SYSTEM)
      // =====================================================
      const rows: any[] = await entityManager.query(
        `
      SELECT 
        "users".*,
        "users"."companyID",
        "users"."customerID",
        "employee"."deptID",
        "employee"."title",
        "users"."extension" AS "extNo"
      FROM "users"
      LEFT JOIN "employee" ON "employee"."ID" = "users"."empID"
      
      WHERE 
        "users"."isActive" = true
        AND ("users"."customerID" = 0 OR "users"."userTY" = 'AD')
        AND "users"."username" = $1
      `,
        [username]
      );

      // =====================================================
      // IF EMPLOYEE FOUND → NORMAL LOGIN FLOW
      // =====================================================
      if (rows.length === 1) {
        const user = rows[0];

        let isPasswordValid = false;

        // md5 password
        if (user.password.length === 32 && /^[a-f0-9]{32}$/i.test(user.password)) {
          isPasswordValid = md5(password) === user.password;
        }
        // bcrypt password
        else {
          isPasswordValid = await bcrypt.compare(password, user.password);
        }

        if (!isPasswordValid) {
          return res.status(401).json({ message: "Username or password is incorrect" });
        }

        const token = jwt.sign(
          { id: user.ID, username: user.username, type: "EMPLOYEE" },
          process.env.JWT_SECRET || "secretKey",
          { expiresIn: "1h" }
        );

        const sessionData: any = {
          login: true,
          userTY: "AD",
          userNM: user.username,
          userID: user.ID,
          compID: user.companyID,
          customerID: user.customerID,
          compNM: user.compNM,
          compCD: user.compCD,
          userFN: `${user.fname}, ${user.lname}`.toUpperCase(),
          userPH: user.mobileno,
          userEM: user.email,
          extension: user.extNo,
          extName: user.extName,
          empUNIT: Number(user.unitID),
        };

        return res.status(200).json({
          message: "Employee login successful",
          token,
          sessionData,
        });
      }

      // =====================================================
      // STEP 2 → TRY CUSTOMER LOGIN
      // =====================================================
      const accountRepo = AppDataSource.getRepository(Account);

      const customer = await accountRepo.findOne({
        where: { username: username },
      });

      if (!customer) {
        return res.status(401).json({
          message: "Username or password is incorrect",
        });
      }

      // plain text password check
      if (customer.userpass !== password) {
        return res.status(401).json({
          message: "Username or password is incorrect",
        });
      }

      const token = jwt.sign(
        {
          id: customer.ID,
          username: customer.username,
          type: "CUSTOMER",
        },
        process.env.JWT_SECRET || "secretKey",
        { expiresIn: "1h" }
      );

      const sessionData = {
        login: true,
        userTY: "CUSTOMER",
        customerID: customer.ID,
        customerName: customer.title,
        customerEmail: customer.emailID,
        companyID: customer.companyID,
      };

      return res.status(200).json({
        message: "Customer login successful",
        token,
        sessionData,
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Error logging in",
        error,
      });
    }
  }

  public async logout(req: Request, res: Response): Promise<Response> {
    try {
      return res.status(200).json({
        message: "Logout successful",
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error logging out",
        error,
      });
    }
  }



}
