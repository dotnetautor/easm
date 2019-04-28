export const get = <TData>(vpath: TData): TData => {
  throw new Error("Do not call get directly");
};

export const set = <TData>(vpath: TData, value: TData) : TData => {
  throw new Error("Do not call set directly");
};

export const push = <TData>(vpath: TData[], value: TData): number => {
  throw new Error("Do not call push directly");
};

export const unshift = <TData>(vpath: TData[], value: TData): number=> {
  throw new Error("Do not call unshift directly");
};

export const pop = <TData>(vpath: TData[]): TData => {
  throw new Error("Do not call pop directly");
};

export const shift = <TData>(vpath: TData[]): TData => {
  throw new Error("Do not call shift directly");
};

export const merge = <TData extends { }>(vpath: TData, value: TData): TData => {
  throw new Error("Do not call merge directly");
};