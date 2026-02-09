import { Product } from "../../../shared/protocol";
import { COLES_ORIGIN, navigateTo } from "../colesDom";
import { Subcategory } from "./getSubcategories";

export interface Category {
  name: string;
  url: string;
  subcategories?: Subcategory[];
}

let categoriesCache: Category[] | undefined = undefined;
export const getCategories = async (): Promise<Category[]> => {
  if (!categoriesCache) {
    await navigateTo(`${COLES_ORIGIN}/browse`);
    const links = findNavCategories();
    categoriesCache = links.map((link) => {
      return {
        name: link.textContent ?? "",
        url: link.href,
      };
    });
  }
  return categoriesCache;
};

const findNavCategories = (): HTMLAnchorElement[] => {
  const navs = Array.from(document.querySelectorAll("nav"));
  for (const nav of navs) {
    const links = Array.from(
      nav.querySelectorAll<HTMLAnchorElement>(
        'a[href^="/browse"], a[href*="/browse/"]'
      )
    );
    if (links.length >= 8) {
      return links;
    }
  }
  return Array.from(
    document.querySelectorAll<HTMLAnchorElement>(
      'a[href^="/browse"], a[href*="/browse/"]'
    )
  );
};
