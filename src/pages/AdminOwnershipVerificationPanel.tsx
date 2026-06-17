import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  Stack,
} from '@mui/material';
import { AdminVerificationReview } from '../components/ownership/AdminVerificationReview';
import { ownershipVerificationService, type OwnershipArtworkItem } from '../services/ownershipVerificationService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: Readonly<TabPanelProps>) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`verification-tabpanel-${index}`}
      aria-labelledby={`verification-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export const AdminOwnershipVerificationPanel: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [pendingVerifications, setPendingVerifications] = useState<any[]>([]);
  const [allVerifications, setAllVerifications] = useState<any[]>([]);
  const [approvedArtworks, setApprovedArtworks] = useState<OwnershipArtworkItem[]>([]);
  const [selectedArtwork, setSelectedArtwork] = useState<OwnershipArtworkItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVerifications();
  }, []);

  const loadVerifications = async () => {
    try {
      setLoading(true);
      setError(null);

      const pendingRes = await ownershipVerificationService.getPendingVerifications(0, 50);
      setPendingVerifications(pendingRes.content || pendingRes);

      const allRes = await ownershipVerificationService.getAllVerifications(0, 50);
      setAllVerifications(allRes.content || allRes);

      const artworkItems = await ownershipVerificationService.getApprovedOwnershipArtworksForAdmin(0, 1000);
      setApprovedArtworks(artworkItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load verifications');
      console.error('Failed to load verifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewComplete = () => {
    loadVerifications();
  };

  const renderLibraryContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (approvedArtworks.length === 0) {
      return <Alert severity="info">No approved ownership artworks yet.</Alert>;
    }

    return (
      <>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          Thumbnail-only storage for all approved copyrighted artworks. Click any item for details.
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 2,
          }}
        >
          {approvedArtworks.map((artwork) => (
            <button
              key={artwork.mediaId}
              type="button"
              onClick={() => setSelectedArtwork(artwork)}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                padding: 6,
                background: '#fff',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <img
                src={artwork.mediaUrl}
                alt={artwork.fileName || 'Registered artwork'}
                style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8 }}
              />
              <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                {artwork.ownerName || 'Unknown owner'}
              </Typography>
            </button>
          ))}
        </Box>
      </>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label={`Pending (${pendingVerifications.length})`} />
          <Tab label={`All Verifications (${allVerifications.length})`} />
          <Tab label={`Copyright Library (${approvedArtworks.length})`} />
        </Tabs>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TabPanel value={tabValue} index={0}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <AdminVerificationReview
            verifications={pendingVerifications}
            loading={false}
            onReviewComplete={handleReviewComplete}
          />
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <AdminVerificationReview
            verifications={allVerifications}
            loading={false}
            onReviewComplete={handleReviewComplete}
          />
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {renderLibraryContent()}
      </TabPanel>

      <Dialog open={Boolean(selectedArtwork)} onClose={() => setSelectedArtwork(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Registered Copyright Artwork</DialogTitle>
        <DialogContent>
          {selectedArtwork && (
            <Stack spacing={2}>
              <img
                src={selectedArtwork.mediaUrl}
                alt={selectedArtwork.fileName || 'Registered artwork'}
                style={{ width: '100%', maxHeight: 420, objectFit: 'contain', borderRadius: 8, background: '#f8fafc' }}
              />
              <Typography variant="body2"><strong>Owner:</strong> {selectedArtwork.ownerName || 'Unknown'}</Typography>
              <Typography variant="body2"><strong>Verification ID:</strong> {selectedArtwork.verificationId}</Typography>
              <Typography variant="body2"><strong>Media ID:</strong> {selectedArtwork.mediaId}</Typography>
              <Typography variant="body2"><strong>Approved at:</strong> {new Date(selectedArtwork.createdAt).toLocaleString()}</Typography>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
};
