// Products saved before sets existed have no setId; they belong to this built-in set
export const DEFAULT_SET_ID = "default";
export const DEFAULT_SET = { id: DEFAULT_SET_ID, name: "Default" };
export const getProductSetId = (product) => product.setId || DEFAULT_SET_ID;
