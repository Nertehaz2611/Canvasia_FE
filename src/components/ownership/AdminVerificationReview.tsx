import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { ownershipVerificationService } from '../../services/ownershipVerificationService';

interface OwnershipVerification {
  id: string;
  userId: string;
  fullName: string;
  dateOfBirth: string;
  identityDocumentType: string;
  identityDocumentNumber: string;
  countryCode: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  adminNotes?: string;
  mediaFiles: Array<{
    id: string;
    mediaUrl: string;
    mediaType: string;
    fileName: string;
  }>;
}

interface AdminVerificationReviewProps {
  verifications: OwnershipVerification[];
  loading: boolean;
  onReviewComplete: () => void;
}

const artworkSectionSx = {
  border: '1px solid rgba(245, 158, 11, 0.28)',
  background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.09), rgba(15, 23, 42, 0.04))',
};

const evidenceSectionSx = {
  border: '1px solid rgba(59, 130, 246, 0.22)',
  background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.08), rgba(15, 23, 42, 0.04))',
};

function isArtworkMedia(mediaType: string): boolean {
  return mediaType.toUpperCase().includes('ARTWORK');
}

export const AdminVerificationReview: React.FC<AdminVerificationReviewProps> = ({
  verifications,
  loading,
  onReviewComplete,
}) => {
  const [selectedVerification, setSelectedVerification] = useState<OwnershipVerification | null>(null);
  const [action, setAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleReview = (verif: OwnershipVerification, reviewAction: 'APPROVE' | 'REJECT') => {
    setSelectedVerification(verif);
    setAction(reviewAction);
    setFormError(null);
    if (reviewAction === 'APPROVE') {
      setRejectionReason('');
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedVerification || !action) return;

    if (action === 'REJECT' && !rejectionReason) {
      setFormError('Please select a rejection reason');
      return;
    }

    try {
      setIsProcessing(true);
      setFormError(null);
      await ownershipVerificationService.reviewOwnershipVerification(selectedVerification.id, {
        action,
        rejectionReason,
        adminNotes,
      });
      setSelectedVerification(null);
      setAction(null);
      setRejectionReason('');
      setAdminNotes('');
      onReviewComplete();
    } catch (error) {
      console.error('Failed to review verification', error);
      setFormError(error instanceof Error ? error.message : 'Failed to review verification');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'error';
      case 'PENDING':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircleIcon sx={{ mr: 1 }} />;
      case 'REJECTED':
        return <CancelIcon sx={{ mr: 1 }} />;
      case 'PENDING':
        return <ScheduleIcon sx={{ mr: 1 }} />;
      default:
        return null;
    }
  };

  const renderMediaItem = (media: OwnershipVerification['mediaFiles'][number], label: string) => (
    <Box
      key={media.id}
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '160px minmax(0, 1fr)' },
        gap: 2,
        alignItems: 'stretch',
        p: 1.5,
        borderRadius: 2,
        border: '1px solid rgba(15, 23, 42, 0.08)',
        backgroundColor: '#ffffff',
        cursor: 'pointer',
        transition: 'border-color 180ms ease, transform 180ms ease, background-color 180ms ease',
        '&:hover': {
          borderColor: label === 'Artwork' ? 'rgba(245, 158, 11, 0.34)' : 'rgba(59, 130, 246, 0.28)',
          backgroundColor: label === 'Artwork' ? 'rgba(255, 251, 235, 1)' : 'rgba(248, 250, 252, 1)',
          transform: 'translateY(-1px)',
        },
      }}
      onClick={() => window.open(media.mediaUrl, '_blank')}
    >
      {media.mediaType.includes('PDF') ? (
        <Box
          sx={{
            minHeight: 120,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: label === 'Artwork' ? '#fff7ed' : '#eff6ff',
            border: '1px solid rgba(15, 23, 42, 0.08)',
            fontWeight: 700,
          }}
        >
          <Typography variant="caption">PDF File</Typography>
        </Box>
      ) : (
        <Box
          component="img"
          src={media.mediaUrl}
          alt={media.fileName}
          sx={{
            width: '100%',
            minHeight: 120,
            maxHeight: 160,
            objectFit: 'cover',
            borderRadius: 1.5,
          }}
        />
      )}

      <Box sx={{ minWidth: 0, display: 'grid', alignContent: 'start', gap: 1 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <Chip
            label={label}
            size="small"
            variant="filled"
            sx={{
              bgcolor: label === 'Artwork' ? '#f59e0b' : '#2563eb',
              color: '#ffffff',
              fontWeight: 700,
            }}
          />
          <Chip
            label={media.mediaType.replaceAll('_', ' ')}
            size="small"
            variant="outlined"
            sx={{
              borderColor: 'rgba(15, 23, 42, 0.12)',
              bgcolor: 'rgba(255, 255, 255, 0.82)',
              fontWeight: 600,
            }}
          />
        </Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, wordBreak: 'break-word' }}>
          {media.fileName || 'Unnamed file'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.84rem' }}>
          Click to open full file
        </Typography>
      </Box>
    </Box>
  );

  const renderMediaSection = (
    title: string,
    description: string,
    medias: OwnershipVerification['mediaFiles'],
    label: string,
  ) => (
    <Box
      sx={{
        display: 'grid',
        gap: 1.25,
        p: 2,
        borderRadius: 3,
        ...(label === 'Artwork' ? artworkSectionSx : evidenceSectionSx),
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </Box>
        <Chip
          label={`${medias.length} file${medias.length === 1 ? '' : 's'}`}
          size="small"
          sx={{
            bgcolor: 'rgba(255, 255, 255, 0.6)',
            border: '1px solid rgba(15, 23, 42, 0.08)',
            fontWeight: 700,
          }}
        />
      </Box>

      {medias.length === 0 ? (
        <Alert severity="info" sx={{ mb: 0, bgcolor: 'rgba(255,255,255,0.75)' }}>
          No {label.toLowerCase()} files uploaded.
        </Alert>
      ) : (
        <Box sx={{ display: 'grid', gap: 1.25 }}>
          {medias.map((media) => renderMediaItem(media, label))}
        </Box>
      )}
    </Box>
  );

  const renderInfoStat = (label: string, value: string) => (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        border: '1px solid rgba(15, 23, 42, 0.08)',
        background: '#ffffff',
      }}
    >
      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 0.4 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
        {value}
      </Typography>
    </Box>
  );

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Box>
      <Box sx={{ display: 'grid', gap: 2 }}>
        {verifications.map((verif) => {
          const artworkMedia = verif.mediaFiles.filter((media) => isArtworkMedia(media.mediaType));
          const supportMedia = verif.mediaFiles.filter((media) => !isArtworkMedia(media.mediaType));

          return (
            <Card
              key={verif.id}
              sx={{
                width: '100%',
                borderRadius: 3,
                border: '1px solid rgba(15, 23, 42, 0.08)',
                background: 'linear-gradient(180deg, #d6dee8 0%, #cbd6e3 100%)',
                boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)',
                overflow: 'hidden',
              }}
            >
              <CardContent sx={{ p: 2.25 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 2,
                    mb: 2,
                    p: 1.75,
                    borderRadius: 2.5,
                    background: 'linear-gradient(180deg, #cfd9e6, #c2cfdf)',
                    border: '1px solid rgba(15, 23, 42, 0.08)',
                  }}
                >
                  <Box>
                    <Typography variant="h6" sx={{ color: '#0f172a', fontWeight: 800 }}>{verif.fullName}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {verif.identityDocumentType}: {verif.identityDocumentNumber}
                    </Typography>
                  </Box>
                  <Chip
                    label={verif.status}
                    color={getStatusColor(verif.status) as any}
                    icon={getStatusIcon(verif.status) as any}
                    sx={{ fontWeight: 800 }}
                  />
                </Box>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                    gap: 1.25,
                    mb: 2,
                  }}
                >
                  {renderInfoStat('Country', verif.countryCode)}
                  {renderInfoStat('DOB', new Date(verif.dateOfBirth).toLocaleDateString())}
                  {renderInfoStat('Submitted', new Date(verif.createdAt).toLocaleDateString())}
                </Box>

                <Box sx={{ display: 'grid', gap: 2 }}>
                  {renderMediaSection(
                    'Artwork Files',
                    'These files represent the claimed original artwork used for similarity and ownership checks.',
                    artworkMedia,
                    'Artwork'
                  )}
                  {renderMediaSection(
                    'Supporting Evidence',
                    'These files are identity proofs or supporting documents that help justify the ownership claim.',
                    supportMedia,
                    'Evidence'
                  )}
                </Box>

                {verif.status === 'PENDING' && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      fullWidth
                      onClick={() => handleReview(verif, 'APPROVE')}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      size="small"
                      fullWidth
                      onClick={() => handleReview(verif, 'REJECT')}
                    >
                      Reject
                    </Button>
                  </Box>
                )}

                {verif.status === 'APPROVED' && verif.reviewedAt && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 2 }}>
                    <strong>Approved on:</strong> {new Date(verif.reviewedAt).toLocaleDateString()}
                  </Typography>
                )}

                {verif.status === 'REJECTED' && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Reason:</strong> {verif.rejectionReason || 'N/A'}
                    </Typography>
                    {verif.adminNotes && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        <strong>Notes:</strong> {verif.adminNotes}
                      </Typography>
                    )}
                  </Alert>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* Review Dialog */}
      <Dialog
        open={selectedVerification !== null && action !== null}
        onClose={() => {
          setSelectedVerification(null);
          setAction(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {action === 'APPROVE' ? 'Approve Verification' : 'Reject Verification'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}

            {action === 'REJECT' && (
              <>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Rejection Reason <strong>*</strong>
                </Typography>
                <Box
                  component="select"
                  value={rejectionReason}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRejectionReason(e.target.value)}
                  sx={{
                    width: '100%',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    px: 1.5,
                    py: 1.5,
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    outline: 'none',
                    mb: 2,
                  }}
                >
                  <option value="">Select reason</option>
                  <option value="INVALID_DOCUMENT">Invalid Document</option>
                  <option value="UNCLEAR_INFORMATION">Unclear Information</option>
                  <option value="MISMATCHED_IDENTITY">Mismatched Identity</option>
                  <option value="SUSPICIOUS_ACTIVITY">Suspicious Activity</option>
                  <option value="OTHER">Other</option>
                </Box>
              </>
            )}

            <TextField
              fullWidth
              label="Admin Notes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              margin="normal"
              multiline
              rows={4}
              placeholder="Optional notes for the user or admin records"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setSelectedVerification(null);
              setAction(null);
            }}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitReview}
            variant="contained"
            color={action === 'APPROVE' ? 'success' : 'error'}
            disabled={isProcessing}
          >
            {isProcessing ? <CircularProgress size={24} /> : action}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
