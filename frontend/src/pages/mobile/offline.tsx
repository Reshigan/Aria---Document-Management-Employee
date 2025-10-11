import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { Box, Container } from '@mui/material';
import { OfflineDocumentManager } from '../../components/mobile';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const MobileOfflinePage: NextPage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Offline Documents - ARIA Document Management</title>
        <meta name="description" content="Manage offline document downloads and storage" />
      </Head>
      <Container maxWidth="xl">
        <Box py={4}>
          <OfflineDocumentManager />
        </Box>
      </Container>
    </>
  );
};

export default MobileOfflinePage;