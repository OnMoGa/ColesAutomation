export interface NextRequestData<TPageProps> {
  pageProps: TPageProps;
}
export interface NextData<TPageProps> {
  props: {
    pageProps: TPageProps;
  };
}
export const getNextData = <TPageProps>(): NextData<TPageProps> => {
  var nextDataScript = document.getElementById("__NEXT_DATA__");
  if (!nextDataScript) {
    throw new Error("Next data script not found");
  }
  return JSON.parse(nextDataScript.textContent ?? "{}");
};
