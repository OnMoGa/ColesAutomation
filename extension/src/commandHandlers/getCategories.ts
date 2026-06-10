import { COLES_ORIGIN, navigateTo } from "../colesDom";
import { FetchInterceptedMessage } from "../injected/fetchHook";
import { getNextData, NextRequestData } from "../nextData";
import { waitForFetchMessage } from "../waitForFetchMessage";
import { Subcategory } from "./getSubcategories";

export interface Category {
  id: string;
  name: string;
  url: string;
  productCount: number;
  subcategories?: Category[];
}

export interface CategoriesPageProps {
  allProductCategories: {
    catalogGroupView: {
      id: string;
      name: string;
      productCount: number;
      seoToken: string;
      catalogGroupView: {
        id: string;
        name: string;
        productCount: number;
        seoToken: string;
        catalogGroupView: {
          id: string;
          name: string;
          productCount: number;
          seoToken: string;
        }[];
      }[];
    }[];
  };
}

export const getCategories = async (): Promise<Category[]> => {
  var waitForMessageTask = waitForFetchMessage(isMessageForCategoryData());
  await navigateTo(`${COLES_ORIGIN}/browse`);
  var nextData = (await waitForMessageTask) as NextRequestData<CategoriesPageProps>;
  const categories = nextData.pageProps.allProductCategories.catalogGroupView.map((category) => {
    return {
      id: category.id,
      name: category.name,
      url: `${COLES_ORIGIN}/browse/${category.seoToken}`,
      productCount: category.productCount,
      subcategories: category.catalogGroupView.map((subcategory) => {
        return {
          id: subcategory.id,
          name: subcategory.name,
          url: `${COLES_ORIGIN}/browse/${category.seoToken}/${subcategory.seoToken}`,
          productCount: subcategory.productCount,
          subcategories: subcategory.catalogGroupView.map((aisle) => {
            return {
              id: aisle.id,
              name: aisle.name,
              url: `${COLES_ORIGIN}/browse/${category.seoToken}/${subcategory.seoToken}/${aisle.seoToken}`,
              productCount: aisle.productCount,
            };
          }),
        };
      }),
    };
  });

  return categories;
};

const isMessageForCategoryData = (): ((message: FetchInterceptedMessage) => boolean) => {
  return (message: FetchInterceptedMessage) => message.url.match(`browse.json`) !== null && message.method === "GET";
};

const findNavCategories = (): HTMLAnchorElement[] => {
  const navs = Array.from(document.querySelectorAll("nav"));
  for (const nav of navs) {
    const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>('a[href^="/browse"], a[href*="/browse/"]'));
    if (links.length >= 8) {
      return links;
    }
  }
  return Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="/browse"], a[href*="/browse/"]'));
};
