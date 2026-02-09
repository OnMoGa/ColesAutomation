export type CommandName =
  | "list_categories"
  | "list_subcategories"
  | "list_subcategory_products"
  | "search_products"
  | "add_to_trolley"
  | "set_trolley_quantity"
  | "get_trolley"
  | "remove_from_trolley"
  | "clear_trolley"
  | "review_order";

export type RequestParams = {
  list_categories: Record<string, never>;
  list_subcategories: { categoryName: string };
  list_subcategory_products: {
    categoryName: string;
    subCategoryName: string;
    limit?: number;
    offset?: number;
  };
  search_products: { query: string; limit?: number; offset?: number };
  add_to_trolley: { productId: string };
  set_trolley_quantity: { productId: string; quantity: number };
  get_trolley: Record<string, never>;
  remove_from_trolley: { productId: string };
  clear_trolley: Record<string, never>;
  review_order: Record<string, never>;
};

export type Product = {
  id: string;
  name: string;
  price: string;
  productUrl: string;
};

export type TrolleyItem = {
  productId?: string;
  name: string;
  quantity: number;
  price?: string;
  totalPrice?: string;
  productUrl?: string;
};

export type CommandResult = {
  open_home: { url: string };
  list_categories: { categories: string[] };
  list_subcategories: { subcategories: string[] };
  list_subcategory_products: {
    products: Product[];
  };
  search_products: { query: string; products: Product[]; total?: number };
  add_to_trolley: { quantity: number };
  set_trolley_quantity: { quantity: number };
  get_trolley: { items: TrolleyItem[]; total?: string };
  remove_from_trolley: { productId: string };
  clear_trolley: { cleared: boolean };
  review_order: {
    items: TrolleyItem[];
    total?: string;
    checkoutEnabled?: boolean;
    warnings?: string[];
  };
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
