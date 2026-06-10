export type CommandName =
  | "list_categories"
  // | "list_subcategories"
  | "list_category_products"
  | "search_products"
  | "add_to_trolley"
  | "set_trolley_quantity"
  | "get_trolley"
  | "remove_from_trolley"
  | "clear_trolley"
  | "review_order"
  | "get_previous_orders"
  | "get_order_details";

export type RequestParams = {
  list_categories: Record<string, never>;
  // list_subcategories: { categoryUrl: string };
  list_category_products: {
    categoryUrl: string;
    page?: number;
  };
  search_products: { query: string; limit?: number; offset?: number };
  add_to_trolley: { productId: string };
  set_trolley_quantity: { productId: string; quantity: number };
  get_trolley: Record<string, never>;
  remove_from_trolley: { productId: string };
  clear_trolley: Record<string, never>;
  review_order: Record<string, never>;
  get_previous_orders: Record<string, never>;
  get_order_details: { orderId: string };
};

export type Product = {
  id: string;
  name: string;
  size: string;
  brand: string;
  description: string;
  price: number;
  productUrl: string;
  categoryIds: string[];
};

export type TrolleyItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  totalPrice: number;
  productUrl?: string;
};

export type PreviousOrderSummary = {
  orderId: string;
  orderStatus: string;
  orderPlacementTime: string;
  orderAttributes: {
    orderTotalPrice: number;
  };
};

export type OrderDetails = {
  items: OrderItem[];
};

export type OrderItem = {
  productId: string;
  quantity: number;
};

export type ProductDetails = {
  productId: string;
  name: string;
  brand: string;
  description: string;
  size: string;
  unitPrice: number;
};

export type Category = {
  id: string;
  name: string;
  url: string;
  productCount: number;
  subcategories?: Category[];
};

export type CommandResult = {
  open_home: { url: string };
  list_categories: { categories: Category[] };
  // list_subcategories: { subcategories: Subcategory[] };
  list_category_products: {
    products: Product[];
    noOfResults: number;
    pageSize: number;
  };
  search_products: { query: string; products: Product[]; total?: number };
  add_to_trolley: { quantity: number };
  set_trolley_quantity: { quantity: number };
  get_trolley: { items: TrolleyItem[] };
  remove_from_trolley: { success: boolean };
  clear_trolley: { cleared: boolean };
  review_order: {
    items: TrolleyItem[];
    total?: string;
    checkoutEnabled?: boolean;
    warnings?: string[];
  };
  get_previous_orders: { orders: PreviousOrderSummary[] };
  get_order_details: { orderDetails: OrderDetails; productInfo: ProductDetails[] };
};

export type ClientRequest<K extends CommandName = CommandName> = {
  id: string;
  type: "request";
  command: K;
  params: RequestParams[K];
};

export type ResponseError = { code: string; message: string };

export type ClientResponse<K extends CommandName = CommandName> = {
  id: string;
  type: "response";
  command: K;
  ok: boolean;
  result?: CommandResult[K];
  error?: ResponseError;
};

/** Keeps-alive between extension and MCP; not part of command RPC. */
export type TransportPingMessage = {
  type: "ping";
  id: string;
};

export type TransportPongMessage = {
  type: "pong";
  id: string;
};
