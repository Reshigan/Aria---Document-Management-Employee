import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Button,
  TextField,
  Toolbar,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  FileDownload as ExportIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'left' | 'right' | 'center';
  format?: (value: any) => string;
}

interface SubDetailTableProps {
  title: string;
  columns: Column[];
  data: any[];
  loading?: boolean;
  onAdd?: () => void;
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  searchable?: boolean;
  exportable?: boolean;
  addable?: boolean;
  editable?: boolean;
  deletable?: boolean;
}

const SubDetailTable: React.FC<SubDetailTableProps> = ({
  title,
  columns,
  data,
  loading = false,
  onAdd,
  onEdit,
  onDelete,
  onRefresh,
  onExport,
  searchable = true,
  exportable = true,
  addable = true,
  editable = true,
  deletable = true,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState(data);

  useEffect(() => {
    if (searchTerm) {
      const filtered = data.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredData(filtered);
    } else {
      setFilteredData(data);
    }
  }, [searchTerm, data]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', mt: 2 }}>
      <Toolbar sx={{ pl: 2, pr: 1, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h6" component="div">
          {title}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {searchable && (
            <TextField
              size="small"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ width: 200 }}
            />
          )}
          {onRefresh && (
            <IconButton onClick={onRefresh} size="small">
              <RefreshIcon />
            </IconButton>
          )}
          {exportable && onExport && (
            <Button
              startIcon={<ExportIcon />}
              onClick={onExport}
              size="small"
              variant="outlined"
            >
              Export
            </Button>
          )}
          {addable && onAdd && (
            <Button
              startIcon={<AddIcon />}
              onClick={onAdd}
              size="small"
              variant="contained"
            >
              Add
            </Button>
          )}
        </Box>
      </Toolbar>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer sx={{ maxHeight: 440 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      align={column.align}
                      style={{ minWidth: column.minWidth }}
                    >
                      {column.label}
                    </TableCell>
                  ))}
                  {(editable || deletable) && (
                    <TableCell align="center" style={{ minWidth: 120 }}>
                      Actions
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((row, index) => (
                    <TableRow hover role="checkbox" tabIndex={-1} key={index}>
                      {columns.map((column) => {
                        const value = row[column.id];
                        return (
                          <TableCell key={column.id} align={column.align}>
                            {column.format ? column.format(value) : value}
                          </TableCell>
                        );
                      })}
                      {(editable || deletable) && (
                        <TableCell align="center">
                          {editable && onEdit && (
                            <IconButton
                              size="small"
                              onClick={() => onEdit(row)}
                              color="primary"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          )}
                          {deletable && onDelete && (
                            <IconButton
                              size="small"
                              onClick={() => onDelete(row)}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={filteredData.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </>
      )}
    </Paper>
  );
};

export default SubDetailTable;
