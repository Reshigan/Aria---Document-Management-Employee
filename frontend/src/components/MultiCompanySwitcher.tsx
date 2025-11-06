import React, { useState, useEffect } from 'react';
import { 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Box, 
  Chip,
  Avatar,
  Typography,
  SelectChangeEvent
} from '@mui/material';
import { Business, CheckCircle } from '@mui/icons-material';

interface Company {
  id: string;
  name: string;
  vat_number: string;
  logo_url?: string;
  is_active: boolean;
}

interface MultiCompanySwitcherProps {
  onCompanyChange?: (companyId: string) => void;
}

const MultiCompanySwitcher: React.FC<MultiCompanySwitcherProps> = ({ onCompanyChange }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const mockCompanies: Company[] = [
        {
          id: 'company-1',
          name: 'Vanta X Holdings (Pty) Ltd',
          vat_number: '4987654321',
          is_active: true
        },
        {
          id: 'company-2',
          name: 'Vanta X Trading (Pty) Ltd',
          vat_number: '4123456789',
          is_active: true
        },
        {
          id: 'company-3',
          name: 'Vanta X Services (Pty) Ltd',
          vat_number: '4555666777',
          is_active: true
        }
      ];

      setCompanies(mockCompanies);
      
      const defaultCompany = mockCompanies.find(c => c.is_active);
      if (defaultCompany) {
        setSelectedCompany(defaultCompany.id);
        if (onCompanyChange) {
          onCompanyChange(defaultCompany.id);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching companies:', error);
      setLoading(false);
    }
  };

  const handleCompanyChange = (event: SelectChangeEvent<string>) => {
    const companyId = event.target.value;
    setSelectedCompany(companyId);
    
    localStorage.setItem('selectedCompanyId', companyId);
    
    if (onCompanyChange) {
      onCompanyChange(companyId);
    }
    
    window.location.reload();
  };

  const getSelectedCompany = () => {
    return companies.find(c => c.id === selectedCompany);
  };

  if (loading) {
    return (
      <Box sx={{ minWidth: 200 }}>
        <Typography variant="body2" color="text.secondary">
          Loading companies...
        </Typography>
      </Box>
    );
  }

  return (
    <FormControl sx={{ minWidth: 250 }} size="small">
      <InputLabel id="company-switcher-label">Company</InputLabel>
      <Select
        labelId="company-switcher-label"
        id="company-switcher"
        value={selectedCompany}
        label="Company"
        onChange={handleCompanyChange}
        renderValue={(value) => {
          const company = companies.find(c => c.id === value);
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {company?.logo_url ? (
                <Avatar src={company.logo_url} sx={{ width: 24, height: 24 }} />
              ) : (
                <Business sx={{ fontSize: 20 }} />
              )}
              <Typography variant="body2" noWrap>
                {company?.name || 'Select Company'}
              </Typography>
            </Box>
          );
        }}
      >
        {companies.map((company) => (
          <MenuItem key={company.id} value={company.id}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              {company.logo_url ? (
                <Avatar src={company.logo_url} sx={{ width: 32, height: 32 }} />
              ) : (
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                  <Business />
                </Avatar>
              )}
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight="medium">
                  {company.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  VAT: {company.vat_number}
                </Typography>
              </Box>
              {company.is_active && (
                <CheckCircle sx={{ fontSize: 20, color: 'success.main' }} />
              )}
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default MultiCompanySwitcher;
