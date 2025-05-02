import { TableCell, TableRow } from "./table";
//import { Gauge } from "@/components/ui/gauge";

export default function LinksVisitors({linkId}: {linkId: string}) {
  const visitors: any = []; // these are the visitor objects based on the linkId

  return (
    <>
      {visitors ? ( 
        visitors.map((visitor : any) => (
          <TableRow key={visitor.id}>
            <TableCell>{visitor.name}</TableCell>
            <TableCell>{visitor.totalDuration}</TableCell>
            <TableCell>
              <h3>
                Hi
              </h3>
            </TableCell>
          </TableRow>
        ))
      ) : null}
    </>
  );
}