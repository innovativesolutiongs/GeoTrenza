// src/controllers/accountController.ts
import { Request, Response } from "express";
import { AppDataSource } from "../ormconfig";
import { allocation } from "../entity/allocation";

export class AccountsController {
  private accountRepo = AppDataSource.getRepository(allocation);

  // GET all accounts
  public getAll = async (_req: Request, res: Response) => {
    try {
      const accounts = await this.accountRepo.find({
        order: { recID: "ASC" },
      });
      res.json(accounts);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching accounts", error });
    }
  };

  // CREATE a new account
  public create = async (req: Request, res: Response) => {
    try {
      const { truckNo, deviceNo, customerId, allocationDate } = req.body;

      // 🔍 Check if device already allocated
      const existingDevice = await this.accountRepo.findOne({
        where: { deviceID: deviceNo },
      });

      if (existingDevice) {
        return res.status(400).json({
          success: false,
          message: "This device is already allocated to another Customer",
        });
      }

      // 🔍 Check if truck already has a device
      const existingTruck = await this.accountRepo.findOne({
        where: { truckID: truckNo },
      });

      if (existingTruck) {
        return res.status(400).json({
          success: false,
          message: "This truck already has a Customer allocated",
        });
      }

      // 👉 Generate next ID
      const lastRecord = await this.accountRepo
        .createQueryBuilder("account")
        .orderBy("account.ID", "DESC")
        .getOne();

      const nextId = lastRecord ? lastRecord.ID + 1 : 1;

      // 👉 Date & Time
      const now = new Date();
      const logDate = now.toISOString().split("T")[0];
      const logTime = now.toTimeString().split(" ")[0];

      const newAccount = this.accountRepo.create({
        ID: nextId,
        truckID: truckNo,
        deviceID: deviceNo,
        customerID: customerId,
        dateID: allocationDate,
        logDate,
        logTime,
      });

      const savedAccount = await this.accountRepo.save(newAccount);

      res.status(201).json(savedAccount);

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error creating account", error });
    }
  };



  // DELETE account by recID
  public delete = async (req: Request, res: Response) => {
    try {
      const recID = parseInt(req.params.id, 10);
      const account = await this.accountRepo.findOneBy({ recID });

      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }

      await this.accountRepo.remove(account);
      res.json({ message: "Account deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error deleting account", error });
    }
  };


  // GET accounts by customerID
  // GET accounts by customerID
  public getByCustomer = async (req: Request, res: Response) => {
    try {
      const customerId = parseInt(req.params.customerId, 10);
      console.log("Fetching allocations for customerID:", customerId);

      const accounts = await this.accountRepo.find({
        where: { customerID: customerId },
      });

      // Always return success, even if empty
      return res.json({
        success: true,
        message: accounts.length
          ? "Allocations fetched successfully"
          : "No allocations found",
        data: accounts, // will be []
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Error fetching customer allocations",
        error,
      });
    }
  };


}
