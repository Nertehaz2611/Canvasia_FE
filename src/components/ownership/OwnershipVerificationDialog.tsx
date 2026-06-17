import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Step,
  Stepper,
  StepLabel,
  Paper,
  IconButton,
  Divider,
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
  Brush as BrushIcon,
  CloudUpload as CloudUploadIcon,
  FilePresent as FilePresentIcon,
  DeleteOutlined as DeleteOutlineIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { ownershipVerificationService } from '../../services/ownershipVerificationService';

interface OwnershipVerificationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface VerificationMedia {
  id: string;
  file: File;
  preview: string;
  type: 'IMAGE' | 'PDF';
  category: 'ARTWORK' | 'SUPPORT';
}

const steps = ['Personal Info', 'Identity Document', 'Upload Proof', 'Review & Submit'];
const MAX_ARTWORK_FILES = 6;
const MAX_SUPPORT_FILES = 6;
const ownershipPremiumText = '#f2c879';
const ownershipPremiumTextStrong = '#ffd58a';
const ownershipPremiumBorder = 'rgba(242, 200, 121, 0.26)';
const ownershipPremiumBorderStrong = 'rgba(242, 200, 121, 0.52)';
const ownershipPremiumSurface = 'rgba(194, 120, 3, 0.1)';
const ownershipPremiumSurfaceStrong = 'rgba(194, 120, 3, 0.16)';
const ownershipPremiumGlow = 'rgba(120, 74, 0, 0.22)';

const ownershipDialogFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 3,
    backgroundColor: 'rgba(15, 22, 12, 0.88)',
    color: '#f3f5f1',
    '& fieldset': {
      borderColor: ownershipPremiumBorder,
    },
    '&:hover fieldset': {
      borderColor: ownershipPremiumBorderStrong,
    },
    '&.Mui-focused fieldset': {
      borderColor: 'rgba(255, 213, 138, 0.78)',
      boxShadow: `0 0 0 3px ${ownershipPremiumGlow}`,
    },
  },
  '& .MuiOutlinedInput-input': {
    color: '#f3f5f1',
  },
  '& .MuiInputBase-input::placeholder': {
    color: 'rgba(228, 232, 222, 0.56)',
    opacity: 1,
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(228, 232, 222, 0.72)',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: ownershipPremiumTextStrong,
  },
  '& .MuiSvgIcon-root': {
    color: 'rgba(228, 232, 222, 0.62)',
  },
};

const ownershipDialogPanelSx = {
  p: 2,
  borderRadius: 3,
  height: '100%',
  background: 'linear-gradient(135deg, rgba(242, 200, 121, 0.12), rgba(194, 120, 3, 0.08))',
  border: `1px solid ${ownershipPremiumBorder}`,
  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
};

export const OwnershipVerificationDialog: React.FC<OwnershipVerificationDialogProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [documentType, setDocumentType] = useState('ID_CARD');
  const [documentNumber, setDocumentNumber] = useState('');
  const [countryCode, setCountryCode] = useState('VN');
  const [mediaFiles, setMediaFiles] = useState<VerificationMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const artworkFiles = useMemo(
    () => mediaFiles.filter((file) => file.category === 'ARTWORK'),
    [mediaFiles]
  );

  const supportFiles = useMemo(
    () => mediaFiles.filter((file) => file.category === 'SUPPORT'),
    [mediaFiles]
  );

  useEffect(() => {
    return () => {
      mediaFiles.forEach((media) => URL.revokeObjectURL(media.preview));
    };
  }, [mediaFiles]);

  const resetForm = () => {
    mediaFiles.forEach((media) => URL.revokeObjectURL(media.preview));
    setActiveStep(0);
    setFullName('');
    setDateOfBirth('');
    setDocumentType('ID_CARD');
    setDocumentNumber('');
    setCountryCode('VN');
    setMediaFiles([]);
    setLoading(false);
    setError(null);
  };

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose();
  };

  const handleMediaUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    category: 'ARTWORK' | 'SUPPORT'
  ) => {
    const files = e.currentTarget.files;
    if (!files) return;

    const currentCategoryCount = mediaFiles.filter((m) => m.category === category).length;
    const maxPerCategory = category === 'ARTWORK' ? MAX_ARTWORK_FILES : MAX_SUPPORT_FILES;
    const remainingSlots = Math.max(maxPerCategory - currentCategoryCount, 0);

    if (remainingSlots === 0) {
      setError(
        category === 'ARTWORK'
          ? `Artwork images are limited to ${MAX_ARTWORK_FILES} files`
          : `Supporting documents are limited to ${MAX_SUPPORT_FILES} files`
      );
      e.currentTarget.value = '';
      return;
    }

    const selectedFiles = Array.from(files).slice(0, remainingSlots);
    const rejectedCount = files.length - selectedFiles.length;

    const preparedFiles: VerificationMedia[] = selectedFiles.map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      preview: URL.createObjectURL(file),
      type: file.type.includes('pdf') ? 'PDF' : 'IMAGE',
      category,
    }));

    setMediaFiles((prev) => [...prev, ...preparedFiles]);

    if (rejectedCount > 0) {
      setError(`${rejectedCount} file(s) were skipped because upload limit was reached`);
    } else {
      setError(null);
    }

    e.currentTarget.value = '';
  };

  const handleRemoveMedia = (mediaId: string) => {
    setMediaFiles((prev) => {
      const target = prev.find((item) => item.id === mediaId);
      if (target) {
        URL.revokeObjectURL(target.preview);
      }
      return prev.filter((item) => item.id !== mediaId);
    });
  };

  const handleNext = () => {
    if (activeStep === 0) {
      if (!fullName || !dateOfBirth) {
        setError('Please fill in all personal information');
        return;
      }
      setError(null);
    } else if (activeStep === 1) {
      if (!documentNumber) {
        setError('Please enter your identity document number');
        return;
      }
      if (countryCode.trim().length !== 2) {
        setError('Country code must contain 2 letters (e.g. VN, US)');
        return;
      }
      setError(null);
    } else if (activeStep === 2) {
      if (artworkFiles.length === 0) {
        setError('Please upload at least one artwork image');
        return;
      }
      if (supportFiles.length === 0) {
        setError('Please upload at least one supporting document');
        return;
      }
      setError(null);
    }
    setActiveStep(activeStep + 1);
  };

  const handleBack = () => {
    setActiveStep(activeStep - 1);
  };

  const handleSubmit = async () => {
    if (artworkFiles.length === 0 || supportFiles.length === 0) {
      setError('Please upload at least one artwork image and at least one supporting document');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Upload media to Cloudinary first (would be handled by ownershipVerificationService)
      // For now, assume mediaUrls are prepared
      const uploadedMedia = await Promise.all(
        mediaFiles.map((m) => ownershipVerificationService.uploadVerificationMedia(m.file))
      );

      const mappedMediaFiles = uploadedMedia.map((media, index) => {
        const sourceFile = mediaFiles[index];

        let ownershipMediaType = 'SUPPORT_IMAGE';
        if (sourceFile?.category === 'ARTWORK') {
          ownershipMediaType = 'ARTWORK_IMAGE';
        } else if (sourceFile?.type === 'PDF') {
          ownershipMediaType = 'SUPPORT_PDF';
        }

        return {
          ...media,
          mediaType: ownershipMediaType,
          displayOrder: index,
        };
      });

      const request = {
        fullName,
        dateOfBirth,
        identityDocumentType: documentType,
        identityDocumentNumber: documentNumber,
        countryCode,
        mediaFiles: mappedMediaFiles,
      };

      await ownershipVerificationService.submitOwnershipVerification(request);
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit verification');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ pt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Chip
                size="small"
                icon={<AutoAwesomeIcon />}
                label="Use legal identity information"
                variant="outlined"
                sx={{
                  color: ownershipPremiumText,
                  borderColor: ownershipPremiumBorderStrong,
                  backgroundColor: ownershipPremiumSurface,
                  '& .MuiChip-icon': {
                    color: ownershipPremiumText,
                  },
                }}
              />
            </Box>
            <TextField
              fullWidth
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              margin="normal"
              placeholder="Your legal name"
              sx={ownershipDialogFieldSx}
            />
            <TextField
              fullWidth
              label="Date of Birth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              margin="normal"
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
              sx={ownershipDialogFieldSx}
            />
          </Box>
        );

      case 1:
        return (
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" sx={{ mb: 1, mt: 0.5 }}>
              Document Type
            </Typography>
            <Box
              component="select"
              value={documentType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDocumentType(e.target.value)}
              sx={{
                width: '100%',
                borderRadius: 3,
                border: `1px solid ${ownershipPremiumBorder}`,
                px: 1.5,
                py: 1.5,
                bgcolor: 'rgba(15, 22, 12, 0.88)',
                color: '#f3f5f1',
                outline: 'none',
                mb: 2,
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.03)',
              }}
            >
              <option value="PASSPORT">Passport</option>
              <option value="ID_CARD">ID Card</option>
              <option value="DRIVER_LICENSE">Driver License</option>
              <option value="OTHER">Other</option>
            </Box>
            <TextField
              fullWidth
              label="Document Number"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              margin="normal"
              placeholder="Your document number"
              sx={ownershipDialogFieldSx}
            />
            <TextField
              fullWidth
              label="Country Code"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
              margin="normal"
              placeholder="VN, US, JP, etc."
              slotProps={{
                htmlInput: {
                  maxLength: 2,
                },
              }}
              sx={ownershipDialogFieldSx}
            />
          </Box>
        );

      case 2:
        return (
          <Box sx={{ pt: 2 }}>
            <Alert
              severity="info"
              sx={{
                mb: 2,
                borderRadius: 3,
                color: '#eef5ea',
                backgroundColor: ownershipPremiumSurface,
                border: `1px solid ${ownershipPremiumBorder}`,
                '& .MuiAlert-icon': {
                  color: ownershipPremiumText,
                },
              }}
            >
              <Typography variant="body2">
                <strong>What to upload:</strong>
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                1. Artwork Images: At least 1 clear photo/image of your artwork (required).
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                2. Supporting Documents: Certificate, contract, invoice, or ID scan (required, at least 1 file).
              </Typography>
              <Typography variant="caption">
                Accepted formats: images and PDFs.
              </Typography>
            </Alert>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 2,
                mb: 2,
              }}
            >
              <Box>
                <Paper
                  variant="outlined"
                  sx={ownershipDialogPanelSx}
                >
                  <Box sx={{ display: 'grid', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ bgcolor: ownershipPremiumSurfaceStrong, color: ownershipPremiumText, width: 30, height: 30 }}>
                        <BrushIcon sx={{ fontSize: 17 }} />
                      </Avatar>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#eef5ea' }}>
                        Artwork Images
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: 'rgba(228, 232, 222, 0.78)' }}>
                      Required. Upload clear artwork photos for AI ownership matching.
                    </Typography>
                    <Button
                      variant="contained"
                      component="label"
                      startIcon={<ImageIcon />}
                      disabled={artworkFiles.length >= MAX_ARTWORK_FILES}
                      sx={{
                        justifyContent: 'flex-start',
                        bgcolor: ownershipPremiumText,
                        color: '#121712',
                        '&:hover': { bgcolor: ownershipPremiumTextStrong },
                      }}
                    >
                      Upload Artwork
                      {' '}
                      <input
                        hidden
                        multiple
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleMediaUpload(e, 'ARTWORK')}
                      />
                    </Button>
                    <Typography variant="caption" sx={{ color: 'rgba(228, 232, 222, 0.78)' }}>Uploaded: {artworkFiles.length}/{MAX_ARTWORK_FILES}</Typography>
                  </Box>
                </Paper>
              </Box>

              <Box>
                <Paper
                  variant="outlined"
                  sx={ownershipDialogPanelSx}
                >
                  <Box sx={{ display: 'grid', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ bgcolor: ownershipPremiumSurfaceStrong, color: ownershipPremiumTextStrong, width: 30, height: 30 }}>
                        <FilePresentIcon sx={{ fontSize: 17 }} />
                      </Avatar>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#eef5ea' }}>
                        Supporting Documents
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: 'rgba(228, 232, 222, 0.78)' }}>
                      Required. Add at least one certificate, invoice, ID scan, or PDF evidence.
                    </Typography>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<CloudUploadIcon />}
                      disabled={supportFiles.length >= MAX_SUPPORT_FILES}
                      sx={{
                        justifyContent: 'flex-start',
                        borderColor: ownershipPremiumBorderStrong,
                        color: ownershipPremiumTextStrong,
                        '&:hover': {
                          borderColor: 'rgba(255, 213, 138, 0.76)',
                          backgroundColor: ownershipPremiumSurface,
                        },
                      }}
                    >
                      Upload Documents
                      {' '}
                      <input
                        hidden
                        multiple
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleMediaUpload(e, 'SUPPORT')}
                      />
                    </Button>
                    <Typography variant="caption" sx={{ color: 'rgba(228, 232, 222, 0.78)' }}>Uploaded: {supportFiles.length}/{MAX_SUPPORT_FILES}</Typography>
                  </Box>
                </Paper>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {mediaFiles.length > 0 && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' },
                  gap: 2,
                }}
              >
                {mediaFiles.map((media) => (
                  <Box key={media.id}>
                    <Card sx={{ borderRadius: 3, overflow: 'hidden', bgcolor: 'rgba(15, 22, 12, 0.92)', border: `1px solid ${ownershipPremiumBorder}` }}>
                      {media.type === 'IMAGE' ? (
                        <img
                          src={media.preview}
                          alt={media.file.name}
                          style={{ width: '100%', height: 150, objectFit: 'cover' }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: '100%',
                            height: 150,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'rgba(228, 232, 222, 0.08)',
                          }}
                        >
                          <FilePresentIcon sx={{ fontSize: 40, color: 'rgba(228, 232, 222, 0.56)' }} />
                        </Box>
                      )}
                      <CardContent sx={{ p: 1.5 }}>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="caption" noWrap sx={{ color: '#eef5ea' }}>
                              {media.file.name}
                            </Typography>
                            <Box>
                              <Chip
                                label={media.category === 'ARTWORK' ? 'Artwork' : 'Support'}
                                size="small"
                                variant="outlined"
                                sx={{
                                  color: ownershipPremiumTextStrong,
                                  borderColor: ownershipPremiumBorder,
                                  backgroundColor: 'rgba(242, 200, 121, 0.05)',
                                }}
                              />
                            </Box>
                          </Box>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveMedia(media.id)}
                            aria-label="remove file"
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </CardContent>
                    </Card>
                  </Box>
                ))}
              </Box>
            )}

            <Typography variant="caption" sx={{ mt: 2, display: 'block', color: 'rgba(228, 232, 222, 0.78)' }}>
              Total uploaded files: {mediaFiles.length}
            </Typography>
          </Box>
        );

      case 3:
        return (
          <Box sx={{ pt: 2 }}>
            <Alert
              severity="info"
              sx={{
                mb: 2,
                color: '#eef5ea',
                backgroundColor: ownershipPremiumSurface,
                border: `1px solid ${ownershipPremiumBorder}`,
                '& .MuiAlert-icon': {
                  color: ownershipPremiumText,
                },
              }}
            >
              Please review your information before submitting
            </Alert>

            <Paper sx={{ p: 2, mb: 2, bgcolor: 'rgba(15, 22, 12, 0.92)', color: '#eef5ea', border: `1px solid ${ownershipPremiumBorder}` }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: ownershipPremiumTextStrong }}>
                Personal Information
              </Typography>
              <Typography variant="body2">
                <strong>Name:</strong> {fullName}
              </Typography>
              <Typography variant="body2">
                <strong>Date of Birth:</strong> {dateOfBirth}
              </Typography>

              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, mt: 2, color: ownershipPremiumTextStrong }}>
                Identity Document
              </Typography>
              <Typography variant="body2">
                <strong>Type:</strong> {documentType}
              </Typography>
              <Typography variant="body2">
                <strong>Number:</strong> {documentNumber}
              </Typography>
              <Typography variant="body2">
                <strong>Country:</strong> {countryCode}
              </Typography>

              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, mt: 2, color: ownershipPremiumTextStrong }}>
                Uploaded Documents
              </Typography>
              <Typography variant="body2">
                <strong>Artwork Images:</strong> {artworkFiles.length}
              </Typography>
              <Typography variant="body2">
                <strong>Supporting Documents:</strong> {supportFiles.length}
              </Typography>
              <Typography variant="body2">
                <strong>Total files:</strong> {mediaFiles.length}
              </Typography>
            </Paper>

            <Alert
              severity="warning"
              sx={{
                color: '#f6ead1',
                backgroundColor: 'rgba(194, 120, 3, 0.12)',
                border: '1px solid rgba(194, 120, 3, 0.24)',
                '& .MuiAlert-icon': {
                  color: '#f2c879',
                },
              }}
            >
              Your submission will be reviewed by our moderation team. This process may take up to 48 hours.
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            border: `1px solid ${ownershipPremiumBorder}`,
            background: 'radial-gradient(circle at 12% -8%, rgba(242, 200, 121, 0.16), transparent 34%), radial-gradient(circle at 100% 0%, rgba(194, 120, 3, 0.12), transparent 26%), rgba(7, 12, 5, 0.96)',
            backdropFilter: 'blur(14px)',
            color: '#f3f5f1',
            boxShadow: '0 28px 68px rgba(0, 0, 0, 0.36)',
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1.5, borderBottom: `1px solid ${ownershipPremiumBorder}` }}>
        <Box sx={{ display: 'grid', gap: 0.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#f3f5f1' }}>
            Ownership Verification
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(228, 232, 222, 0.82)' }}>
            Verify your identity and upload your artwork evidence for moderation review.
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent
        sx={{
          color: '#f3f5f1',
          ...(activeStep >= 2
            ? {
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                '&::-webkit-scrollbar': {
                  display: 'none',
                },
              }
            : null),
        }}
      >
        <Stepper
          activeStep={activeStep}
          alternativeLabel
          sx={{
            pt: 2,
            '& .MuiStepLabel-label': {
              color: 'rgba(228, 232, 222, 0.52)',
              fontWeight: 700,
            },
            '& .MuiStepLabel-label.Mui-active': {
              color: ownershipPremiumTextStrong,
            },
            '& .MuiStepLabel-label.Mui-completed': {
              color: ownershipPremiumText,
            },
            '& .MuiStepIcon-root': {
              color: ownershipPremiumBorder,
            },
            '& .MuiStepIcon-root.Mui-active': {
              color: ownershipPremiumText,
            },
            '& .MuiStepIcon-root.Mui-completed': {
              color: ownershipPremiumTextStrong,
            },
            '& .MuiStepIcon-text': {
              fill: '#f3f5f1',
              fontWeight: 800,
            },
            '& .MuiStepConnector-line': {
              borderColor: ownershipPremiumBorder,
            },
          }}
        >
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mt: 2, color: '#ffe0e0', backgroundColor: 'rgba(210, 87, 87, 0.12)', border: '1px solid rgba(210, 87, 87, 0.24)' }}>
            {error}
          </Alert>
        )}

        {renderStepContent()}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, pt: 1.5, borderTop: `1px solid ${ownershipPremiumBorder}` }}>
        <Button onClick={handleClose} disabled={loading} sx={{ color: '#f0dcb5' }}>Cancel</Button>
        <Button
          onClick={handleBack}
          disabled={activeStep === 0 || loading}
          sx={{ color: '#f0dcb5' }}
        >
          Back
        </Button>
        {activeStep === steps.length - 1 ? (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
            sx={{ minWidth: 120, bgcolor: ownershipPremiumText, color: '#121712', '&:hover': { bgcolor: ownershipPremiumTextStrong } }}
          >
            {loading ? <CircularProgress size={24} /> : 'Submit'}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            variant="contained"
            sx={{ minWidth: 100, bgcolor: ownershipPremiumText, color: '#121712', '&:hover': { bgcolor: ownershipPremiumTextStrong } }}
          >
            Next
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
