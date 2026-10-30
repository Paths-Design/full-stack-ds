// @generated:start imports
import { type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import "./Table.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface TableProps extends Omit<HTMLAttributes<HTMLDivElement>, "ariaLabel" | "children" | "className" | "data-testid" | "responsive"> {
  responsive?: boolean;
  ariaLabel?: string;
  className?: string;
  "data-testid"?: string;
  children?: ReactNode;
}
// @generated:end

// @generated:start subcomponents
export interface TableCaptionProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
  id?: string;
  style?: CSSProperties;
  lang?: string;
  dir?: "ltr" | "rtl" | "auto";
  title?: string;
}

export function TableCaption({
  children,
  className,
  "data-testid": testId,
  id,
  style,
  lang,
  dir,
  title,
}: TableCaptionProps) {
  const classNames = ["table__caption", className].filter(Boolean).join(" ");
  return (
    <caption className={classNames} data-testid={testId} id={id} style={style} lang={lang} dir={dir} title={title}>
      {children}
    </caption>
  );
}

export interface TableHeadProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
  id?: string;
  style?: CSSProperties;
  lang?: string;
  dir?: "ltr" | "rtl" | "auto";
  title?: string;
}

export function TableHead({
  children,
  className,
  "data-testid": testId,
  id,
  style,
  lang,
  dir,
  title,
}: TableHeadProps) {
  const classNames = ["table__head", className].filter(Boolean).join(" ");
  return (
    <thead className={classNames} data-testid={testId} id={id} style={style} lang={lang} dir={dir} title={title}>
      {children}
    </thead>
  );
}

export interface TableBodyProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
  id?: string;
  style?: CSSProperties;
  lang?: string;
  dir?: "ltr" | "rtl" | "auto";
  title?: string;
}

export function TableBody({
  children,
  className,
  "data-testid": testId,
  id,
  style,
  lang,
  dir,
  title,
}: TableBodyProps) {
  const classNames = ["table__body", className].filter(Boolean).join(" ");
  return (
    <tbody className={classNames} data-testid={testId} id={id} style={style} lang={lang} dir={dir} title={title}>
      {children}
    </tbody>
  );
}

export interface TableFooterProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
  id?: string;
  style?: CSSProperties;
  lang?: string;
  dir?: "ltr" | "rtl" | "auto";
  title?: string;
}

export function TableFooter({
  children,
  className,
  "data-testid": testId,
  id,
  style,
  lang,
  dir,
  title,
}: TableFooterProps) {
  const classNames = ["table__footer", className].filter(Boolean).join(" ");
  return (
    <tfoot className={classNames} data-testid={testId} id={id} style={style} lang={lang} dir={dir} title={title}>
      {children}
    </tfoot>
  );
}

export interface TableRowProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
  id?: string;
  style?: CSSProperties;
  lang?: string;
  dir?: "ltr" | "rtl" | "auto";
  title?: string;
}

export function TableRow({
  children,
  className,
  "data-testid": testId,
  id,
  style,
  lang,
  dir,
  title,
}: TableRowProps) {
  const classNames = ["table__row", className].filter(Boolean).join(" ");
  return (
    <tr className={classNames} data-testid={testId} id={id} style={style} lang={lang} dir={dir} title={title}>
      {children}
    </tr>
  );
}

export interface TableHeaderCellProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
  id?: string;
  style?: CSSProperties;
  lang?: string;
  dir?: "ltr" | "rtl" | "auto";
  title?: string;
  colSpan?: number;
  rowSpan?: number;
  headers?: string;
  scope?: "col" | "row" | "colgroup" | "rowgroup";
  abbr?: string;
  ariaSort?: "none" | "ascending" | "descending" | "other";
}

export function TableHeaderCell({
  children,
  className,
  "data-testid": testId,
  id,
  style,
  lang,
  dir,
  title,
  colSpan,
  rowSpan,
  headers,
  scope,
  abbr,
  ariaSort,
}: TableHeaderCellProps) {
  const classNames = ["table__headerCell", className].filter(Boolean).join(" ");
  return (
    <th className={classNames} data-testid={testId} id={id} style={style} lang={lang} dir={dir} title={title} colSpan={colSpan} rowSpan={rowSpan} headers={headers} scope={scope} abbr={abbr} aria-sort={ariaSort}>
      {children}
    </th>
  );
}

export interface TableCellProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
  id?: string;
  style?: CSSProperties;
  lang?: string;
  dir?: "ltr" | "rtl" | "auto";
  title?: string;
  colSpan?: number;
  rowSpan?: number;
  headers?: string;
}

export function TableCell({
  children,
  className,
  "data-testid": testId,
  id,
  style,
  lang,
  dir,
  title,
  colSpan,
  rowSpan,
  headers,
}: TableCellProps) {
  const classNames = ["table__cell", className].filter(Boolean).join(" ");
  return (
    <td className={classNames} data-testid={testId} id={id} style={style} lang={lang} dir={dir} title={title} colSpan={colSpan} rowSpan={rowSpan} headers={headers}>
      {children}
    </td>
  );
}
// @generated:end

// @generated:start component
export function Table({
  className,
  "data-testid": testId,
  children,
  responsive: _responsive,
  ariaLabel,
  ...rest
}: TableProps) {
  const classNames = [
    "table",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
  <div className={`${classNames}`} data-testid={testId} data-fsds-component="table" data-fsds-box="" {...rest}>
    <table className="table__container" aria-label={ariaLabel}>
      {children}
    </table>
  </div>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
