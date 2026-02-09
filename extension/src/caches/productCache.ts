import { Product } from "../../../shared/protocol";

const productCache: Map<string, Product> = new Map();

export const updateProductCache = (product: Product): void => {
  productCache.set(product.id, product);
};

export const updateProductCacheBulk = (products: Product[]): void => {
  products.forEach((product) => {
    productCache.set(product.id, product);
  });
};

export const getProductById = (id: string): Product | undefined => {
  return productCache.get(id);
};
