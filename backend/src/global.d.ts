import "express-session";

declare module "express-session" {
  interface SessionData {
    WEBSITE?: {
      userID: number;
      empID: number;
      userTY: string;
      desigID: number;
      mDeptID: number;
      compID: number;
      [key: string]: any;
    };
  }
}
