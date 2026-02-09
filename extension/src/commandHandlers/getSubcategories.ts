import { Product } from "../../../shared/protocol";
import { navigateTo } from "../colesDom";
import { getCategories } from "./getCategories";

export interface Subcategory {
  name: string;
  url: string;
  products?: Product[];
}

export const getSubcategories = async (
  categoryName: string
): Promise<Subcategory[]> => {
  const categories = await getCategories();
  const category = categories.find(
    (category) => category.name === categoryName
  );
  if (!category) {
    throw new Error(`Category not found: ${categoryName}`);
  }
  if (!category.subcategories) {
    await navigateTo(category.url);
    const navList = document.querySelector('[data-testid="navigation-list"]');
    if (!navList) {
      throw new Error("Navigation list not found.");
    }
    const links = Array.from(
      navList.querySelectorAll<HTMLAnchorElement>('[data-testid="nav-link"]')
    );
    category.subcategories = links.map((link) => {
      return {
        name: link.textContent,
        url: link.href,
      };
    });
  }
  return category.subcategories;
};
