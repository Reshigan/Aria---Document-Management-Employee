import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { Box, Container } from '@mui/material';
import { SyncMonitor } from '../../components/mobile';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const MobileSyncPage: NextPage = () => {
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
        <title>Mobile Sync Monitor - ARIA Document Management</title>
        <meta name="description" content="Monitor mobile device synchronization status and history" />
      </Head>
      <Container maxWidth="xl">
        <Box py={4}>
          <SyncMonitor />
        </Box>
      </Container>
    </>
  );
};

export default MobileSyncPage;