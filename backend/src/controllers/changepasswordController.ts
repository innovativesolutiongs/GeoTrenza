import { Request, Response } from "express";
import { AppDataSource } from "../ormconfig";
import { User } from "../entity/User";
import * as bcrypt from "bcryptjs";

export class changepasswordController {

  async changePassword(req: Request, res: Response): Promise<Response> {
    try {
      const { customerID, oldPassword, newPassword } = req.body;

      console.log( req.body);

      if (!customerID || !oldPassword || !newPassword) {
        return res.status(400).json({
          status: false,
          message: "All fields are required",
        });
      }

      const userRepository = AppDataSource.getRepository(User);

      // Find user
      const user = await userRepository.findOne({
        where: { customerID: customerID }, // change id if your column name is different
      });

      if (!user) {
        return res.status(404).json({
          status: false,
          message: "User not found",
        });
      }

      // Compare old password
      const isMatch = await bcrypt.compare(oldPassword, user.password);

      if (!isMatch) {
        return res.status(400).json({
          status: false,
          message: "Old password is incorrect",
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      user.password = hashedPassword;
      await userRepository.save(user);

      return res.json({
        status: true,
        message: "Password updated successfully",
      });

    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "Server error",
        error,
      });
    }
  }
}
