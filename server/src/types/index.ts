export interface User {
  id?: number;
  name: string;
  phone: string;
  totalOrdersAmount: number;
  visitCount: number;
  averageCheck: number;
}

export interface Database {
  users: User[];
  products: any[];
  orders: any[];
  [key: string]: any[];
}

export interface CrudHandlers {
  create: (req: any, res: any) => void;
  readAll: (req: any, res: any) => void;
  readOne: (req: any, res: any) => void;
  update: (req: any, res: any) => void;
  delete: (req: any, res: any) => void;
}
