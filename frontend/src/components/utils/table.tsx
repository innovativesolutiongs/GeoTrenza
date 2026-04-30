import * as React from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';

interface DataItem {
  id: number;
  statusID: number;
  reasonType: string;
}

interface Props {
  data: DataItem[];
}

const columns: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 250 },
  { field: 'reasonType', headerName: 'Reason', width: 500 },
  { field: 'status', headerName: 'Status', width: 400 },
];

const getStatus = (statusID: number): string => {
  
  return statusID === 1 ? 'Active' : 'Inactive';
}

export default function BasicTable({ data }: Props) {
  
  // Map over data to set the status field
  const rows = data.map((item) => ({
    ...item,
  }));

  return (
    <div style={{ height: 400, width: '100%' }}>
      <DataGrid
        rows={rows}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 5 },
          },
        }}
        pageSizeOptions={[10, 20,30,40]}
        checkboxSelection
        style={{ width: '100%' }} // Ensures the table takes full width
      />
    </div>
  );
}
