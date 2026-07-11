/* eslint-disable @typescript-eslint/no-explicit-any */
import { Children, type JSX } from "react";

interface Props {
  render: (item: any, index: number) => JSX.Element;
  of: React.ReactNode[] | any[];
}

export const EachElement = ({ render, of }: Props) => {
  return Children.toArray(of?.map((item, index) => render(item, index)));
};
