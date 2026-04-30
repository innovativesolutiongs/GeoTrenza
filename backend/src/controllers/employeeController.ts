import { Request, Response } from "express";
import { AppDataSource } from "../ormconfig";
import { Employee } from "../entity/employee";

export class EmployeeController {
    private employeeRepo = AppDataSource.getRepository(Employee);

    // ✅ GET ALL EMPLOYEES
    getEmployees = async (req: Request, res: Response) => {
        try {
            const { companyID } = req.params; // or req.body / req.query

            const employees = await this.employeeRepo.find({
                where: { companyID: Number(companyID) },
                order: { ID: "DESC" },
            });

            return res.json({
                status: true,
                data: employees,
            });
        } catch (error) {
            return res.status(500).json({
                status: false,
                message: "Failed to fetch employees",
                error,
            });
        }
    };


    // ✅ GET SINGLE EMPLOYEE
    getEmployeeById = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const employee = await this.employeeRepo.findOne({
                where: { ID: Number(id) },
            });

            if (!employee) {
                return res.status(404).json({
                    status: false,
                    message: "Employee not found",
                });
            }

            return res.json({
                status: true,
                data: employee,
            });
        } catch (error) {
            return res.status(500).json({
                status: false,
                message: "Failed to fetch employee",
                error,
            });
        }
    };

    // ✅ CREATE EMPLOYEE
    createEmployee = async (req: Request, res: Response) => {
        try {
            const employee = this.employeeRepo.create(req.body);
            const result = await this.employeeRepo.save(employee);

            return res.json({
                status: true,
                message: "Employee created successfully",
                data: result,
            });
        } catch (error) {
            return res.status(500).json({
                status: false,
                message: "Failed to create employee",
                error,
            });
        }
    };

    // ✅ UPDATE EMPLOYEE
    updateEmployee = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const employee = await this.employeeRepo.findOne({
                where: { ID: Number(id) },
            });

            if (!employee) {
                return res.status(404).json({
                    status: false,
                    message: "Employee not found",
                });
            }

            this.employeeRepo.merge(employee, req.body);
            const result = await this.employeeRepo.save(employee);

            return res.json({
                status: true,
                message: "Employee updated successfully",
                data: result,
            });
        } catch (error) {
            return res.status(500).json({
                status: false,
                message: "Failed to update employee",
                error,
            });
        }
    };

    // ✅ DELETE EMPLOYEE
    deleteEmployee = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const employee = await this.employeeRepo.findOne({
                where: { ID: Number(id) },
            });

            if (!employee) {
                return res.status(404).json({
                    status: false,
                    message: "Employee not found",
                });
            }

            await this.employeeRepo.remove(employee);

            return res.json({
                status: true,
                message: "Employee deleted successfully",
            });
        } catch (error) {
            return res.status(500).json({
                status: false,
                message: "Failed to delete employee",
                error,
            });
        }
    };
}
