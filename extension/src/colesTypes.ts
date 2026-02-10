export interface OrderDetails {
  orderId: string;
  orderModifiedFlag: boolean;
  orderModificationCount: number;
  items: OrderItem[];
  totalPrice: number;
  totalQuantity: number;
  totalSaving: number;
  totalPriceAvailableItems: number;
  totalSavingAvailableItems: number;
  minOrderValue: number;
  reviewTrolley: boolean;
  // orderAttributes: OrderAttributes;
  // shoppingConfiguration: ShoppingConfiguration;
  // orderContinuityData: OrderContinuityDaum[];
  // customerContinuityData: CustomerContinuityData;
  // unavailableItems: any[];
}

export interface OrderItem {
  orderItemId: string;
  productId: number;
  quantity: number;
  itemSaving: number;
  itemTotal: number;
  unitPrice: number;
  itemSubstitutionSelected: string;
  product: OrderItemProduct;
}

export interface OrderItemProduct {
  name: string;
  brand: string;
  description: string;
  size: string;
  excludedFromSubstitution: boolean;
  availability: boolean;
  // imageUris: ImageUri[]
  // restrictions: Restrictions
  merchandiseHeir: MerchandiseHeir;
  onlineHeirs: OnlineHeir[];
  pricing: Pricing;
}

export interface MerchandiseHeir {
  tradeProfitCentre: string;
  categoryGroup: string;
  category: string;
  subCategory: string;
  className: string;
}

export interface OnlineHeir {
  aisle: string;
  category: string;
  subCategory: string;
  categoryId: string;
  aisleId: string;
  subCategoryId: string;
}

export interface Pricing {
  now: number;
  was: number;
  unit: Unit;
  comparable: string;
  onlineSpecial: boolean;
}

export interface Unit {
  quantity: number;
  ofMeasureQuantity: number;
  ofMeasureUnits: string;
  price: number;
  ofMeasureType: string;
  isWeighted: boolean;
  isIncremental: boolean;
}
