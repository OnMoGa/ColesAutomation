export interface CurrentOrderDetails {
  orderId: string;
  orderModifiedFlag: boolean;
  orderModificationCount: number;
  items: CurrentOrderItem[];
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

export interface CurrentOrderItem {
  orderItemId: string;
  productId: number;
  quantity: number;
  itemSaving: number;
  itemTotal: number;
  unitPrice: number;
  itemSubstitutionSelected: string;
  product: CurrentOrderItemProduct;
}

export interface CurrentOrderItemProduct {
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

export interface PreviousOrderDetails {
  items: PreviousOrderProduct[];
}

export interface PreviousOrderProduct {
  id: number;
  name: string;
  brand: string;
  description: string;
  size: string;
  orderItem: PreviousOrderItem;
}

export interface PreviousOrderItem {
  orderItemId: string;
  quantity: number;
  unitPrice: number;
  itemTotalPrice: number;
}

export interface PreviousOrders {
  noOfOrders: number;
  totalNoOfOrders: number;
  lastDeliveredOrderDate: string;
  orders: PreviousOrder[];
}

export interface PreviousOrder {
  orderId: string;
  orderStatus: string;
  orderPlacementTime: string;
  orderAttributes: {
    orderTotalPrice: number;
  };
}
