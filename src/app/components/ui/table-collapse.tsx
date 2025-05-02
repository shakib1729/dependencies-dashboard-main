import { TableCell, TableRow } from "./table";


export default function LinksVisitors({linkId}: {linkId: string) {
    const packages: any = []; // these are the visitor objects based on the linkId
  
    return (
      <>
        {packages ? ( 
          packages.map((package: any) => (
            <TableRow key={package.id}>
              <TableCell>{package.version}</TableCell>
              <TableCell>{package.size}</TableCell>
              <TableCell>{package.date}</TableCell>
              <TableCell>{package.latest}</TableCell>
            </TableRow>
          ))
        ) : null}
      </>
    );
  }
  