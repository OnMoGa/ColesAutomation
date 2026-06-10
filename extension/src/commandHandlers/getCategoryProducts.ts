import { CommandResult, Product } from "../../../shared/protocol";
import { COLES_ORIGIN, navigateTo } from "../colesDom";
import { FetchInterceptedMessage } from "../injected/fetchHook";
import { NextRequestData } from "../nextData";
import { waitForFetchMessage } from "../waitForFetchMessage";

export interface CategoryProductsPageProps {
  searchResults: {
    noOfResults: number;
    pageSize: number;
    results: (
      | {
          _type: "PRODUCT";
          id: number;
          name: string;
          size: string;
          brand: string;
          description: string;
          onlineHeirs: {
            category: string;
            categoryId: string;
            subCategory: string;
            subCategoryId: string;
            aisle: string;
            aisleId: string;
          }[];
          pricing: {
            comparable: string;
            now: number;
            unit: {
              ofMeasureUnits: string;
              quantity: number;
            };
          };
        }
      | {
          _type: "SINGLE_TILE";
        }
    )[];
  };
}

export const getCategoryProducts = async (
  categoryUrl: string,
  page: number,
): Promise<CommandResult["list_category_products"]> => {
  var waitForMessageTask = waitForFetchMessage(isMessageForCategoryProductsData(categoryUrl));
  var url = new URL(categoryUrl);
  if (page > 1) {
    url.searchParams.set("page", page.toString());
  }
  await navigateTo(url.toString());
  var nextData = (await waitForMessageTask) as NextRequestData<CategoryProductsPageProps>;

  var products: Product[] = nextData.pageProps.searchResults.results
    .filter((result) => result._type === "PRODUCT")
    .map((result) => {
      return {
        id: result.id.toString(),
        name: result.name,
        size: result.size,
        brand: result.brand,
        description: result.description,
        price: result.pricing.now,
        productUrl: `${COLES_ORIGIN}/product/${result.id}`,
        categoryIds: [
          ...new Set(result.onlineHeirs.flatMap((heir) => [heir.categoryId, heir.subCategoryId, heir.aisleId])),
        ],
      };
    });

  return {
    products,
    noOfResults: nextData.pageProps.searchResults.noOfResults,
    pageSize: nextData.pageProps.searchResults.pageSize,
  };
};

const isMessageForCategoryProductsData = (categoryUrl: string): ((message: FetchInterceptedMessage) => boolean) => {
  const url = new URL(categoryUrl);
  const pathname = url.pathname;
  return (message: FetchInterceptedMessage) =>
    message.url.match(`${pathname}.json`) !== null && message.method === "GET";
};

// const extractProductsFromPage = (): Product[] => {
//   const container = document.querySelector<HTMLElement>('[data-testid="product-tiles"]');
//   if (!container) {
//     throw new Error("Product tiles container not found.");
//   }
//   const productTiles = Array.from(container.querySelectorAll<HTMLElement>('[data-testid="product-tile"]'));

//   var products: Product[] = productTiles.map((productTile) => {
//     var productId = productTile.querySelector("[data-bv-product-id]")?.getAttribute("data-bv-product-id") ?? "unknown";

//     var productLink = productTile.querySelector<HTMLAnchorElement>('a[href*="/product/"]');
//     var productName = productLink?.getAttribute("aria-label") ?? "";
//     var productPrice = productTile.querySelector<HTMLSpanElement>('[data-testid="product-pricing"]')?.innerText ?? "";

//     return {
//       id: productId,
//       name: productName,
//       price: Number(productPrice),
//       productUrl: productLink?.href ?? "",
//     };
//   });
//   return products;
// };
