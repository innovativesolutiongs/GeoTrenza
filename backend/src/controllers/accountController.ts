import { Request, Response } from "express";
import { AppDataSource } from "../ormconfig";
import { Account } from "../entity/account";
import { User } from "../entity/User";
import md5 from "md5";


export class AccountsController {
  private accountsRepo = AppDataSource.getRepository(Account);
  private usersRepo = AppDataSource.getRepository(User);




  getAll = async (req: Request, res: Response): Promise<Response> => {
    try {
      const companyID = req.query.companyID as string;
      if (!companyID) {
        return res.status(400).json({
          success: false,
          message: "companyID is required",
        });
      }

      const records = await this.accountsRepo.find({
        where: { companyID: Number(companyID) },
      });

      return res.status(200).json({
        success: true,
        data: records,
      });
    } catch (error: any) {
      console.error("GET /accounts ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching accounts",
        error: error.message,
      });
    }
  };


  create = async (req: Request, res: Response): Promise<Response> => {
    try {
      const {
        code,
        title,
        dotNo,
        mcNo,
        address,
        stateName,
        cityName,
        zipCode,
        shpAddress,
        shpStateName,
        shpCityName,
        shpZipCode,
        phoneNo,
        emailID,
        nemailID,
        firstName,
        lastName,
        dlNo,
        totT,
        totD,
        totS,
        batchID,
        teamID,
        assignTo,
        planID,
        elogID,
        elogKey,
        chkConfim,
        appActiveID,
        wapActiveID,
        mayaPlanID,
        planTypeID,
        rowID,
        imageFile,
        statusID,
        companyID,
        createdByUserID
      } = req.body;

      console.log("Request Body →", req.body);

      // REQUIRED VALIDATION
      if (!code || !title) {
        return res.status(400).json({
          success: false,
          message: "code and title are required",
        });
      }

      // 🔎 CHECK IF DOT NUMBER ALREADY EXISTS
      if (dotNo) {
        const existingDot = await this.accountsRepo.findOne({
          where: { dotNo }
        });

        if (existingDot) {
          return res.status(409).json({
            success: false,
            message: "DOT Number already exists. Cannot create duplicate employee."
          });
        }
      }

      const logID = new Date();

      const newAccount = this.accountsRepo.create({
        code,
        title,
        dotNo: dotNo || "",
        mcNo: mcNo || "",
        address: address || "",
        stateName: Number(stateName) || 0,
        cityName: Number(cityName) || 0,
        zipCode: Number(zipCode) || 0,
        shpAddress: shpAddress || "",
        shpStateName: Number(shpStateName) || 0,
        shpCityName: Number(shpCityName) || 0,
        shpZipCode: Number(shpZipCode) || 0,
        phoneNo: phoneNo || "",
        emailID: emailID || "",
        nemailID: nemailID || "",
        firstName: firstName || "",
        lastName: lastName || "",
        dlNo: dlNo || "",
        totT: Number(totT) || 0,
        totD: Number(totD) || 0,
        totS: Number(totS) || 0,
        batchID: Number(batchID) || 0,
        teamID: teamID || "",
        assignTo: assignTo || "",
        planID: Number(planID) || 0,
        elogID: Number(elogID) || 2,
        elogKey: elogKey || "",
        chkConfim: Number(chkConfim) || 0,
        appActiveID: Number(appActiveID) || 2,
        wapActiveID: Number(wapActiveID) || 2,
        mayaPlanID: Number(mayaPlanID) || 0,
        planTypeID: Number(planTypeID) || 0,
        rowID: Number(rowID) || 0,
        imageFile: imageFile || "",
        statusID: Number(statusID) || 1,
        logID,
        companyID: companyID,
        userID: createdByUserID,
      });

      await this.accountsRepo.save(newAccount);

      return res.status(201).json({
        success: true,
        data: newAccount,
        // message: "Account created successfully",
      });

    } catch (error: any) {
      console.error("POST /accounts ERROR:", error);

      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message: "Duplicate record detected",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Error creating account",
        error: error.message,
      });
    }
  };


update = async (req: Request, res: Response): Promise<Response> => {
  try {
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID is required",
      });
    }

    const account = await this.accountsRepo.findOneBy({ ID: id });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    const {
      code,
      title,
      dotNo,
      mcNo,
      address,
      zipCode,
      phoneNo,
      emailID,
      nemailID,
      firstName,
      lastName,
      statusID,
      logID
    } = req.body;

    // 🔎 Check duplicate DOT number (exclude current record)
    if (dotNo) {
      const existingDot = await this.accountsRepo
        .createQueryBuilder("account")
        .where("account.dotNo = :dotNo", { dotNo })
        .andWhere("account.ID != :id", { id })
        .getOne();

      if (existingDot) {
        return res.status(409).json({
          success: false,
          message: "DOT Number already exists. Cannot update duplicate employee.",
        });
      }
    }

    // update only if value is provided
    account.code = code ?? account.code;
    account.title = title ?? account.title;
    account.dotNo = dotNo ?? account.dotNo;
    account.mcNo = mcNo ?? account.mcNo;
    account.address = address ?? account.address;
    account.zipCode = zipCode ?? account.zipCode;
    account.phoneNo = phoneNo ?? account.phoneNo;
    account.emailID = emailID ?? account.emailID;
    account.nemailID = nemailID ?? account.nemailID;
    account.firstName = firstName ?? account.firstName;
    account.lastName = lastName ?? account.lastName;
    account.statusID = statusID ?? account.statusID;
    account.logID = logID ?? account.logID;

    await this.accountsRepo.save(account);

    return res.status(200).json({
      success: true,
      data: account,
      message: "Account updated successfully",
    });

  } catch (error: any) {
    console.error("PUT /accounts/:id ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating account",
      error: error.message,
    });
  }
};


  // DELETE
  delete = async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = Number(req.params.id);

      console.log("Received ID:", id);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid ID is required",
        });
      }

      const account = await this.accountsRepo.findOneBy({ ID: id });

      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Account not found",
        });
      }

      await this.accountsRepo.remove(account);

      return res.status(200).json({
        success: true,
        message: "Account deleted successfully",
      });
    } catch (error: any) {
      console.error("DELETE ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Error deleting account",
        error: error.message,
      });
    }
  };

  // updateUserCredentials = async (req: Request, res: Response): Promise<Response> => {
  //   try {
  //     const { customerID, username, password } = req.body;

  //     console.log(req.body)

  //     if (!customerID) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "customerID is required",
  //       });
  //     }

  //     const account = await this.accountsRepo.findOneBy({
  //       ID: Number(customerID),
  //     });

  //     if (!account) {
  //       return res.status(404).json({
  //         success: false,
  //         message: "Account not found",
  //       });
  //     }

  //     // update only provided fields
  //     if (username !== undefined) {
  //       account.username = username;
  //     }

  //     if (password !== undefined) {
  //       account.userpass = password; // ⚠ no hashing as requested
  //     }

  //     account.logID = new Date();

  //     await this.accountsRepo.save(account);

  //     return res.status(200).json({
  //       success: true,
  //       message: "Credentials updated successfully",
  //       data: account,
  //     });

  //   } catch (error: any) {
  //     console.error("UPDATE CREDENTIALS ERROR:", error);

  //     return res.status(500).json({
  //       success: false,
  //       message: "Error updating credentials",
  //       error: error.message,
  //     });
  //   }
  // };


  updateUserCredentials = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { customerID, username, password } = req.body;

      console.log(req.body);

      if (!customerID) {
        return res.status(400).json({
          success: false,
          message: "customerID is required",
        });
      }

      const account = await this.accountsRepo.findOneBy({
        ID: Number(customerID),
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Account not found",
        });
      }

      // Update account username
      if (username !== undefined) {
        account.username = username;
      }

      // Update account password
      if (password !== undefined) {
        account.userpass = password;
      }

      account.logID = new Date();

      await this.accountsRepo.save(account);

      // ===== CREATE USER IN USERS TABLE =====
      if (username && password) {

        const encryptedPassword = md5(password);

        // check if user already exists
        const existingUser = await this.usersRepo.findOne({
          where: { username }
        });

        if (!existingUser) {

          const newUser = this.usersRepo.create({
            companyID: account.companyID,
            customerID: account.ID,
            staffID: 0,
            etypeID: 1,
            uroleID: 0,
            suroleID: 0,
            empID: 0,

            username: username,
            fname: account.firstName || "",
            lname: account.lastName || "",

            email: account.emailID || "",
            mobileno: account.phoneNo || "",

            password: encryptedPassword,
            pstexts: password,

            userTY: "CUS",

            fcmID: "",
            telnyx_user_id: "",
            telnyx_conn_id: "",

            chkSupv: 0,
            isActive: 1,
            is_online: 0,
            extension: 0,

            logID: new Date(),
          });

          await this.usersRepo.save(newUser);
        }
      }

      return res.status(200).json({
        success: true,
        message: "Credentials updated and user created successfully",
        data: account,
      });

    } catch (error: any) {
      console.error("UPDATE CREDENTIALS ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Error updating credentials",
        error: error.message,
      });
    }
  };

}
