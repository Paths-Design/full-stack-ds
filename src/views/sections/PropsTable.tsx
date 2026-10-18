import { Card,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
 } from "@full-stack-ds/react";
import { propDefault } from "../../lib/prop-default";
import type { ComponentContract, PropMember } from "../../types/data";

interface PropsTableProps {
  members: PropMember[];
  /** The contract's messages, so a message-defaulted prop shows its default text. */
  messages?: ComponentContract["messages"];
}

export function PropsTable({ members, messages }: PropsTableProps) {
  return (
    <Card className="showcase-card">
      <Table className="props-table" ariaLabel="Component props">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Prop</TableHeaderCell>
            <TableHeaderCell>Type</TableHeaderCell>
            <TableHeaderCell>Default</TableHeaderCell>
            <TableHeaderCell>Description</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {members.map((m) => {
            const value = propDefault(m, messages);
            return (
            <TableRow key={m.name}>
              <TableCell>
                <code>{m.name}</code>
                {m.required && (
                  <Badge
                    variant="tag"
                    intent="danger"
                    size="sm"
                    style={{ marginLeft: "var(--fsds-core-spacing-size-05)" }}
                  >
                    required
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <code>{m.type}</code>
              </TableCell>
              <TableCell>
                {value !== undefined ? (
                  <>
                    <code>{JSON.stringify(value)}</code>
                    {m.defaultMessage !== undefined && (
                      <span className="subtle"> message:{m.defaultMessage}</span>
                    )}
                  </>
                ) : (
                  <span className="subtle">—</span>
                )}
              </TableCell>
              <TableCell>
                {m.description ? (
                  <span className="muted">{m.description}</span>
                ) : (
                  <span className="subtle">—</span>
                )}
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
