export interface NextRequestData<T> {
  pageProps: T;
}
export interface NextData<T> {
  props: {
    pageProps: T;
  };
}
export const getNextData = <T>(): NextData<T> => {
  var nextDataScript = document.getElementById("__NEXT_DATA__");
  if (!nextDataScript) {
    throw new Error("Next data script not found");
  }
  return JSON.parse(nextDataScript.textContent ?? "{}");
};
