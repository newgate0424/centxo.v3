'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X, ChevronDown, Folder, FileVideo, FileImage, CheckCircle2, Circle, AlertCircle, Trash2, MessageCircle, Send } from 'lucide-react';
import { useAdAccount } from '@/contexts/AdAccountContext';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AdAccount {
  id: string;
  account_id: string;
  name: string;
}

interface AdMessage {
  id: string;
  text: string;
}

interface FacebookPage {
  id: string;
  name: string;
}

interface Beneficiary {
  id: string;
  name: string;
}

interface UploadedVideo {
  name: string;
  path: string;
  size: number;
  uploadedAt: string;
}

interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
  detail?: string;
}

export default function LaunchPage() {
  const { t, language } = useLanguage();
  const { data: session } = useSession();
  const { selectedAccounts, selectedPages: contextPages } = useAdAccount();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([]);
  const [selectedExistingVideos, setSelectedExistingVideos] = useState<string[]>([]);
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [pageSearchQuery, setPageSearchQuery] = useState('');
  const [isPageDropdownOpen, setIsPageDropdownOpen] = useState(false);
  const [deleteConfirmFile, setDeleteConfirmFile] = useState<UploadedVideo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'select' | 'deselect'>('select');
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loadingBeneficiaries, setLoadingBeneficiaries] = useState(false);

  // AI Chat Widget State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([
    { role: 'ai', content: t('launch.ai.greeting', 'Hello! I am your AI Assistant...') }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    mediaFile: null as File | null,
    thumbnailFile: null as File | null,
    selectedAdAccount: '',
    campaignObjective: 'OUTCOME_ENGAGEMENT',
    selectedPage: '',
    budgetType: 'daily' as 'daily' | 'lifetime',
    dailyBudget: 20,
    lifetimeBudget: 1000,
    startTime: '',
    endTime: '',
    useAudienceTimezone: true,
    enableAdSchedule: false,
    adSchedule: {} as Record<string, number[]>,
    campaignCount: 1,
    adSetCount: 1,
    adsCount: 1,
    beneficiaryName: '',
    // V2 New Fields
    productDescription: '',
    targetAudienceDescription: '',
  });

  const campaignObjectives = [
    { id: 'OUTCOME_AWARENESS', name: t('launch.objective.awareness', 'Awareness'), description: t('launch.objective.awarenessDesc', 'Increase brand awareness') },
    { id: 'OUTCOME_TRAFFIC', name: t('launch.objective.traffic', 'Traffic'), description: t('launch.objective.trafficDesc', 'Drive traffic to your website') },
    { id: 'OUTCOME_ENGAGEMENT', name: t('launch.objective.engagement', 'Engagement'), description: t('launch.objective.engagementDesc', 'Get more page likes, response, etc.'), specialNote: t('launch.objective.engagementNote', 'Engagement Campaign') },
    { id: 'OUTCOME_LEADS', name: t('launch.objective.leads', 'Leads'), description: t('launch.objective.leadsDesc', 'Collect leads for your business') },
    { id: 'OUTCOME_APP_PROMOTION', name: t('launch.objective.appPromotion', 'App Promotion'), description: t('launch.objective.appPromotionDesc', 'Get more people to install your app') },
    { id: 'OUTCOME_SALES', name: t('launch.objective.sales', 'Sales'), description: t('launch.objective.salesDesc', 'Find people likely to purchase') },
  ];

  // Fetch uploaded videos on mount
  useEffect(() => {
    const fetchUploadedVideos = async () => {
      try {
        const response = await fetch('/api/videos/list');
        if (response.ok) {
          const data = await response.json();
          setUploadedVideos(data.videos || []);
        }
      } catch (error) {
        console.error('Error fetching videos:', error);
      }
    };

    if (session?.user) {
      fetchUploadedVideos();
    }
  }, [session]);

  // Fetch beneficiaries when ad account is selected
  useEffect(() => {
    const fetchBeneficiaries = async () => {
      if (!formData.selectedAdAccount) {
        setBeneficiaries([]);
        return;
      }

      setLoadingBeneficiaries(true);
      try {
        const url = new URL('/api/facebook/beneficiaries', window.location.origin);
        url.searchParams.set('adAccountId', formData.selectedAdAccount);
        if (formData.selectedPage) {
          url.searchParams.set('pageId', formData.selectedPage);
        }

        const response = await fetch(url.toString());
        if (response.ok) {
          const data = await response.json();
          setBeneficiaries(data.beneficiaries || []);
          console.log(`✓ Loaded ${data.beneficiaries?.length || 0} beneficiaries`);

          // Auto-select first beneficiary if available
          if (data.beneficiaries && data.beneficiaries.length > 0 && !formData.beneficiaryName) {
            setFormData(prev => ({
              ...prev,
              beneficiaryName: data.beneficiaries[0].id
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching beneficiaries:', error);
      } finally {
        setLoadingBeneficiaries(false);
      }
    };

    fetchBeneficiaries();
  }, [formData.selectedAdAccount, formData.selectedPage]);

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (1.5GB max)
      const maxSize = 1.5 * 1024 * 1024 * 1024; // 1.5GB in bytes

      if (file.size > maxSize) {
        setError(t('launch.error.fileSize', `File ${file.name} is larger than 1.5GB`).replace('{name}', file.name));
        return;
      }

      // Check if file is video or image
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (!isVideo && !isImage) {
        setError(t('launch.error.fileType', 'Please upload video or image files only'));
        return;
      }

      setFormData({
        ...formData,
        mediaFile: file,
      });
      setError('');
    }
  };

  const handleRemoveMedia = () => {
    setFormData({
      ...formData,
      mediaFile: null,
      thumbnailFile: null,
    });
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file is image
      if (!file.type.startsWith('image/')) {
        setError(t('launch.error.imageOnly', 'Please upload image files only'));
        return;
      }

      setFormData({
        ...formData,
        thumbnailFile: file,
      });
      setError('');
    }
  };

  const handleRemoveThumbnail = () => {
    setFormData({
      ...formData,
      thumbnailFile: null,
    });
  };

  const handlePageSelect = (pageId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedPage: pageId,
    }));
    setIsPageDropdownOpen(false);
  };

  const filteredPages = contextPages.filter(page =>
    page.name.toLowerCase().includes(pageSearchQuery.toLowerCase()) ||
    page.id.toLowerCase().includes(pageSearchQuery.toLowerCase())
  );

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleChatSend = async () => {
    if (!chatInput.trim() || isAiTyping) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsAiTyping(true);

    // Simulate AI response (can be replaced with real API call)
    // Simulate AI response (can be replaced with real API call)
    setTimeout(() => {
      const aiResponses = [
        t('launch.ai.suggestion1', 'I understand! For "{message}", I recommend...').replace('{message}', userMessage),
        t('launch.ai.suggestion2', 'Great question! If you are promoting...').replace('{product}', formData.productDescription || 'your product'),
        t('launch.ai.suggestion3', 'For target audience, clarify gender...'),
        t('launch.ai.suggestion4', 'Pro tip: Use clear product images...'),
      ];
      const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
      setChatMessages(prev => [...prev, { role: 'ai', content: randomResponse }]);
      setIsAiTyping(false);
    }, 1500);
  };

  const handleStart = async () => {
    setError('');
    setSuccess('');

    // Validation
    if (!formData.mediaFile && selectedExistingVideos.length === 0) {
      setError(t('launch.error.required', 'Please fill in all required fields'));
      return;
    }
    if (!formData.selectedAdAccount) {
      setError(t('launch.error.required', 'Please fill in all required fields'));
      return;
    }
    if (!formData.campaignObjective) {
      setError(t('launch.error.required', 'Please fill in all required fields'));
      return;
    }
    if (!formData.selectedPage) {
      setError(t('launch.error.required', 'Please fill in all required fields'));
      return;
    }
    if (formData.adSetCount < formData.campaignCount) {
      setError(t('launch.error.adSetCount', 'AdSet count must be greater than or equal to Campaign count'));
      return;
    }
    if (formData.adsCount < formData.adSetCount) {
      setError(t('launch.error.adsCount', 'Ads count must be greater than or equal to AdSet count'));
      return;
    }
    if (!formData.selectedPage) {
      setError(t('launch.error.required', 'Please fill in all required fields'));
      return;
    }

    setLoading(true);
    setUploadProgress({});

    // Initialize progress dialog
    setIsProgressDialogOpen(true);
    const initialSteps: ProgressStep[] = [
      { id: 'prepare', label: t('launch.progress.prepare', 'Preparing Data'), status: 'loading', detail: t('launch.progress.description', 'Please wait...') },
      { id: 'ai', label: t('launch.progress.ai', 'AI Analysis'), status: 'pending', detail: t('launch.progress.description', 'Please wait...') },
      { id: 'upload', label: t('launch.progress.upload', 'Uploading Files'), status: 'pending', detail: t('launch.progress.description', 'Please wait...') },
      { id: 'campaign', label: t('launch.progress.campaign', 'Creating Campaign'), status: 'pending', detail: t('launch.progress.description', 'Please wait...') },
      { id: 'adsets', label: t('launch.progress.adsets', 'Creating AdSets'), status: 'pending', detail: t('launch.progress.description', 'Please wait...') },
      { id: 'ads', label: t('launch.progress.ads', 'Creating Ads'), status: 'pending', detail: t('launch.progress.description', 'Please wait...') },
      { id: 'complete', label: t('launch.progress.complete', 'Completed'), status: 'pending', detail: t('launch.progress.description', 'Please wait...') },
    ];
    setProgressSteps(initialSteps);

    const updateStep = (stepId: string, status: ProgressStep['status'], detail?: string) => {
      setProgressSteps(prev => prev.map(step =>
        step.id === stepId ? { ...step, status, detail: detail || step.detail } : step
      ));
    };

    try {
      // Step 1: Prepare
      updateStep('prepare', 'loading', 'กำลังรวบรวมไฟล์...');
      await new Promise(resolve => setTimeout(resolve, 500)); // Visual delay
      // Collect all media files (new upload + existing files)
      const allMediaFiles: { file?: File; existingName?: string; name: string; isVideo: boolean }[] = [];

      if (formData.mediaFile) {
        const isVideo = formData.mediaFile.type.startsWith('video/');
        allMediaFiles.push({
          file: formData.mediaFile,
          name: formData.mediaFile.name,
          isVideo,
        });
      }

      for (const videoName of selectedExistingVideos) {
        const isVideo = videoName.match(/\.(mp4|webm|mov|avi)$/i) !== null;
        allMediaFiles.push({
          existingName: videoName,
          name: videoName,
          isVideo,
        });
      }

      updateStep('prepare', 'completed', `พบ ${allMediaFiles.length} ไฟล์`);

      // AI Analysis with realistic delays
      updateStep('ai', 'loading', 'กำลังโหลดโมเดล AI...');
      await new Promise(resolve => setTimeout(resolve, 800));

      updateStep('ai', 'loading', 'กำลังวิเคราะห์เนื้อหาในไฟล์...');
      await new Promise(resolve => setTimeout(resolve, 1200));

      updateStep('ai', 'loading', 'กำลังระบุหมวดหมู่สินค้า...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      updateStep('ai', 'loading', 'กำลังสร้างข้อความโฆษณา...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      updateStep('ai', 'loading', 'กำลังวิเคราะห์กลุ่มเป้าหมาย...');
      await new Promise(resolve => setTimeout(resolve, 800));

      // If we have multiple files, create ONE campaign with multiple files
      // If we have one file, create campaigns according to campaignCount
      const shouldCreateMultipleCampaigns = allMediaFiles.length === 1 && formData.campaignCount > 1;

      if (allMediaFiles.length > 1) {
        // Multiple files → Create ONE campaign, distribute files across Ads
        console.log(`Creating 1 campaign with ${allMediaFiles.length} media files`);

        updateStep('ai', 'completed', 'วิเคราะห์เสร็จสิ้น');
        updateStep('upload', 'loading', `กำลังเตรียม ${allMediaFiles.length} ไฟล์...`);

        const uploadFormData = new FormData();

        // Append all files
        allMediaFiles.forEach((media, index) => {
          if (media.file) {
            uploadFormData.append(`file_${index}`, media.file);
          } else if (media.existingName) {
            uploadFormData.append(`existingVideo_${index}`, media.existingName);
          }
          uploadFormData.append(`mediaType_${index}`, media.isVideo ? 'video' : 'image');
        });

        uploadFormData.append('mediaCount', allMediaFiles.length.toString());
        uploadFormData.append('adAccountId', formData.selectedAdAccount);
        uploadFormData.append('campaignObjective', formData.campaignObjective);
        uploadFormData.append('pageId', formData.selectedPage);
        uploadFormData.append('budgetType', formData.budgetType);
        uploadFormData.append('dailyBudget', formData.dailyBudget.toString());
        uploadFormData.append('lifetimeBudget', formData.lifetimeBudget.toString());
        if (formData.budgetType === 'lifetime') {
          if (formData.startTime) uploadFormData.append('startTime', formData.startTime);
          if (formData.endTime) uploadFormData.append('endTime', formData.endTime);
          uploadFormData.append('useAudienceTimezone', formData.useAudienceTimezone.toString());
        }
        uploadFormData.append('campaignCount', '1'); // Force 1 campaign for multiple files
        uploadFormData.append('adSetCount', formData.adSetCount.toString());
        uploadFormData.append('adsCount', formData.adsCount.toString());
        // V2: Product and Target Audience Context
        if (formData.productDescription) {
          uploadFormData.append('productContext', formData.productDescription);
        }
        if (formData.targetAudienceDescription) {
          uploadFormData.append('targetAudienceContext', formData.targetAudienceDescription);
        }

        allMediaFiles.forEach(media => {
          setUploadProgress(prev => ({ ...prev, [media.name]: 50 }));
        });

        updateStep('upload', 'completed', `อัปโหลด ${allMediaFiles.length} ไฟล์สำเร็จ`);
        updateStep('campaign', 'loading', 'กำลังสร้างแคมเปญบน Facebook...');

        const response = await fetch('/api/campaigns/create-multi', {
          method: 'POST',
          body: uploadFormData,
        });

        const data = await response.json();

        if (!response.ok) {
          updateStep('campaign', 'error', data.error || 'เกิดข้อผิดพลาด');
          throw new Error(data.error || 'Failed to create campaign');
        }

        updateStep('campaign', 'completed', t('launch.success', 'Campaign created successfully!'));
        updateStep('adsets', 'completed', t('launch.progress.complete', 'Completed'));
        updateStep('ads', 'completed', t('launch.progress.complete', 'Completed'));
        updateStep('complete', 'completed', t('launch.progress.complete', 'Completed'));

        allMediaFiles.forEach(media => {
          setUploadProgress(prev => ({ ...prev, [media.name]: 100 }));
        });

        setSuccess(t('launch.success', 'Campaign created successfully!'));
      } else if (allMediaFiles.length === 1) {
        // Single file → Create campaigns according to campaignCount
        const media = allMediaFiles[0];

        // AI Analysis with realistic delays
        updateStep('ai', 'loading', 'กำลังโหลดโมเดล AI...');
        await new Promise(resolve => setTimeout(resolve, 800));

        updateStep('ai', 'loading', 'กำลังวิเคราะห์เนื้อหาในไฟล์...');
        await new Promise(resolve => setTimeout(resolve, 1200));

        updateStep('ai', 'loading', 'กำลังระบุหมวดหมู่สินค้า...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        updateStep('ai', 'loading', 'กำลังสร้างข้อความโฆษณา...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        updateStep('ai', 'loading', 'กำลังวิเคราะห์กลุ่มเป้าหมาย...');
        await new Promise(resolve => setTimeout(resolve, 800));

        updateStep('ai', 'completed', 'วิเคราะห์เสร็จสิ้น');
        updateStep('upload', 'loading', 'กำลังเตรียมไฟล์...');

        const uploadFormData = new FormData();

        if (media.file) {
          uploadFormData.append('file', media.file);
        } else if (media.existingName) {
          uploadFormData.append('existingVideo', media.existingName);
        }

        // Add thumbnail if provided (for videos only)
        if (formData.thumbnailFile && media.isVideo) {
          uploadFormData.append('thumbnail', formData.thumbnailFile);
        }

        uploadFormData.append('mediaType', media.isVideo ? 'video' : 'image');
        uploadFormData.append('adAccountId', formData.selectedAdAccount);
        uploadFormData.append('campaignObjective', formData.campaignObjective);
        uploadFormData.append('pageId', formData.selectedPage);
        uploadFormData.append('budgetType', formData.budgetType);
        uploadFormData.append('dailyBudget', formData.dailyBudget.toString());
        uploadFormData.append('lifetimeBudget', formData.lifetimeBudget.toString());
        if (formData.budgetType === 'lifetime') {
          if (formData.startTime) uploadFormData.append('startTime', formData.startTime);
          if (formData.endTime) uploadFormData.append('endTime', formData.endTime);
          uploadFormData.append('useAudienceTimezone', formData.useAudienceTimezone.toString());
        }
        uploadFormData.append('campaignCount', formData.campaignCount.toString());
        uploadFormData.append('adSetCount', formData.adSetCount.toString());
        uploadFormData.append('adsCount', formData.adsCount.toString());
        uploadFormData.append('beneficiaryName', formData.beneficiaryName);
        // V2: Product and Target Audience Context
        if (formData.productDescription) {
          uploadFormData.append('productContext', formData.productDescription);
        }
        if (formData.targetAudienceDescription) {
          uploadFormData.append('targetAudienceContext', formData.targetAudienceDescription);
        }

        updateStep('upload', 'completed', 'อัปโหลดไฟล์สำเร็จ');
        updateStep('campaign', 'loading', 'กำลังสร้างแคมเปญบน Facebook...');

        setUploadProgress(prev => ({ ...prev, [media.name]: 0 }));

        const response = await fetch('/api/campaigns/create', {
          method: 'POST',
          body: uploadFormData,
        });

        const data = await response.json();

        if (!response.ok) {
          updateStep('campaign', 'error', data.error || 'เกิดข้อผิดพลาด');
          throw new Error(data.error || `Failed to create campaign`);
        }

        updateStep('campaign', 'completed', t('launch.success', 'Campaign created successfully!'));
        updateStep('adsets', 'completed', t('launch.progress.complete', 'Completed'));
        updateStep('ads', 'completed', t('launch.progress.complete', 'Completed'));
        updateStep('complete', 'completed', t('launch.progress.complete', 'Completed'));

        setUploadProgress(prev => ({ ...prev, [media.name]: 100 }));

        setSuccess(t('launch.success', 'Campaign created successfully!'));
      }

      // Redirect to campaigns page after successful creation
      setTimeout(() => {
        router.push('/campaigns');
      }, 1500); // Give user time to see success message

      // Reset form
      setFormData({
        mediaFile: null,
        thumbnailFile: null,
        selectedAdAccount: '',
        campaignObjective: 'OUTCOME_ENGAGEMENT',
        selectedPage: '',
        budgetType: 'daily',
        dailyBudget: 20,
        lifetimeBudget: 1000,
        startTime: '',
        endTime: '',
        useAudienceTimezone: true,
        enableAdSchedule: false,
        adSchedule: {},
        campaignCount: 1,
        adSetCount: 1,
        adsCount: 1,
        beneficiaryName: '',
        productDescription: '',
        targetAudienceDescription: '',
      });
      setSelectedExistingVideos([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-muted p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Please log in to create a campaign</p>
          <Button onClick={() => router.push('/login')} className="bg-blue-600 hover:bg-blue-700 text-white">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-4 md:p-6 lg:p-8 flex flex-col overflow-hidden">
      <div className="max-w-3xl mx-auto w-full flex flex-col h-full">
        <div className="mb-6 flex-shrink-0">
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('launch.title')}</h1>
          <p className="text-gray-600">{t('launch.subtitle')}</p>
        </div>

        {/* Progress Dialog */}
        <Dialog open={isProgressDialogOpen} onOpenChange={(open) => {
          // Prevent closing while in progress
          if (!open && progressSteps.some(s => s.status === 'loading')) {
            return;
          }
          setIsProgressDialogOpen(open);
        }}>
          <DialogContent className="max-w-md">
            {/* Confetti on completion */}
            {progressSteps.every(s => s.status === 'completed') && (
              <Confetti
                width={500}
                height={600}
                recycle={false}
                numberOfPieces={200}
                gravity={0.3}
              />
            )}

            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="h-5 w-5 text-blue-600" />
                </motion.div>
                {t('launch.progress.title', 'Creating Campaign')}
              </DialogTitle>
              <DialogDescription>
                {t('launch.progress.description', 'Please wait...')}
              </DialogDescription>
            </DialogHeader>

            {/* Progress Bar */}
            <div className="py-2">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                <span>{t('launch.progress.title', 'Progress')}</span>
                <span>{Math.round((progressSteps.filter(s => s.status === 'completed').length / progressSteps.length) * 100)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-green-500"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${(progressSteps.filter(s => s.status === 'completed').length / progressSteps.length) * 100}%`
                  }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-3 py-4">
              <AnimatePresence mode="popLayout">
                {progressSteps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <AnimatePresence mode="wait">
                        {step.status === 'completed' ? (
                          <motion.div
                            key="completed"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          >
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          </motion.div>
                        ) : step.status === 'loading' ? (
                          <motion.div
                            key="loading"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Loader2 className="h-5 w-5 text-blue-600" />
                          </motion.div>
                        ) : step.status === 'error' ? (
                          <motion.div
                            key="error"
                            initial={{ scale: 0 }}
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.3 }}
                          >
                            <AlertCircle className="h-5 w-5 text-red-600" />
                          </motion.div>
                        ) : (
                          <Circle className="h-5 w-5 text-gray-300" />
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="flex-1 min-w-0">
                      <motion.p
                        className={`text-sm font-medium ${step.status === 'completed' ? 'text-green-600' :
                          step.status === 'loading' ? 'text-blue-600' :
                            step.status === 'error' ? 'text-red-600' :
                              'text-gray-400'
                          }`}
                        animate={step.status === 'loading' ? { opacity: [0.5, 1, 0.5] } : {}}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        {step.label}
                      </motion.p>
                      <motion.p
                        className="text-xs text-gray-500 mt-0.5"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        {step.detail}
                      </motion.p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Success Button */}
            {progressSteps.every(s => s.status === 'completed') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex justify-end pt-4 border-t"
              >
                <Button
                  onClick={() => {
                    setIsProgressDialogOpen(false);
                    // Force refresh when returning to campaigns page
                    router.push('/campaigns?refresh=true');
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {t('launch.goToCampaigns', 'Go to Campaigns')} 🎉
                </Button>
              </motion.div>
            )}
          </DialogContent>
        </Dialog>

        {/* Main Content Card with Scroll */}
        <div className="glass-card flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="overflow-y-auto flex-1 p-6">

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            )}

            {/* Step 1: Upload Media (Single File) */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground">{t('launch.step1', '1. Upload File')}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFileDialogOpen(true)}
                  className="flex items-center gap-2 hover:opacity-70 transition-opacity cursor-pointer"
                  title="ดูไฟล์ที่เคยอัปโหลด"
                >
                  <Folder className="h-6 w-6 text-blue-600" />
                </button>
              </div>

              {/* File Library Dialog */}
              <Dialog open={isFileDialogOpen} onOpenChange={setIsFileDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
                  <DialogHeader className="flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                      <Folder className="h-5 w-5 text-blue-600" />
                      {t('launch.uploadFile', 'Upload File')}
                    </DialogTitle>
                    <DialogDescription>
                      {t('launch.uploadFile', 'Select file to upload')}
                    </DialogDescription>
                  </DialogHeader>

                  {uploadedVideos.length === 0 ? (
                    <div className="py-12 text-center text-gray-500">
                      <Folder className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p>ยังไม่มีไฟล์ที่อัปโหลด</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto pr-2">
                        {uploadedVideos.map((video) => {
                          const isVideo = video.name.match(/\.(mp4|webm|mov)$/i);
                          const isSelected = selectedExistingVideos.includes(video.name);
                          return (
                            <div
                              key={video.name}
                              className={`flex items-center gap-3 p-2 rounded-lg border-2 transition-all ${isSelected
                                ? 'border-blue-500 bg-blue-50 shadow-md'
                                : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
                                }`}
                            >
                              {/* Select Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedExistingVideos(selectedExistingVideos.filter(n => n !== video.name));
                                  } else {
                                    setSelectedExistingVideos([...selectedExistingVideos, video.name]);
                                  }
                                }}
                                className="flex items-center gap-3 flex-1 min-w-0"
                              >
                                {/* Thumbnail 40x40px */}
                                <div className="relative flex-shrink-0 w-10 h-10 bg-gray-100 rounded overflow-hidden">
                                  {isVideo ? (
                                    <video
                                      src={video.path}
                                      className="w-full h-full object-cover"
                                      muted
                                      preload="metadata"
                                    />
                                  ) : (
                                    <img
                                      src={video.path}
                                      alt={video.name}
                                      className="w-full h-full object-cover"
                                    />
                                  )}

                                  {/* Media Type Badge (smaller) */}
                                  <div className="absolute bottom-0 right-0 bg-black/70 rounded-tl px-1">
                                    {isVideo ? (
                                      <FileVideo className="h-2.5 w-2.5 text-white" />
                                    ) : (
                                      <FileImage className="h-2.5 w-2.5 text-white" />
                                    )}
                                  </div>
                                </div>

                                {/* File Info */}
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="text-sm font-medium text-foreground truncate" title={video.name}>
                                    {video.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {(video.size / (1024 * 1024)).toFixed(2)} MB
                                  </p>
                                </div>

                                {/* Selected Checkmark */}
                                {isSelected && (
                                  <div className="flex-shrink-0 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">✓</span>
                                  </div>
                                )}
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmFile(video)}
                                className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="ลบไฟล์"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {selectedExistingVideos.length > 0 && (
                        <div className="flex-shrink-0 mt-4 pt-4 border-t border-gray-200 space-y-3">
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="text-sm font-medium text-blue-900">
                              ✓ เลือกแล้ว: {selectedExistingVideos.length} ไฟล์
                            </p>
                          </div>
                          <Button
                            type="button"
                            onClick={() => {
                              setIsFileDialogOpen(false);
                              // Scroll to next step
                              setTimeout(() => {
                                const nextStep = document.querySelector('[data-step="2"]');
                                nextStep?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }, 300);
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            ใช้ไฟล์ที่เลือก ({selectedExistingVideos.length})
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </DialogContent>
              </Dialog>

              {/* Delete Confirmation Dialog */}
              <Dialog open={!!deleteConfirmFile} onOpenChange={(open) => !open && setDeleteConfirmFile(null)}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-5 w-5" />
                      ยืนยันการลบไฟล์
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 pt-4">
                    <p className="text-sm text-muted-foreground">
                      คุณแน่ใจหรือไม่ว่าต้องการลบไฟล์นี้?
                    </p>
                    {deleteConfirmFile && (
                      <div className="bg-muted p-3 rounded-lg border border-border">
                        <p className="text-sm font-medium text-foreground truncate">
                          📄 {deleteConfirmFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ขนาด: {(deleteConfirmFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    )}
                    <p className="text-sm text-red-600 font-medium">
                      ⚠️ การดำเนินการนี้ไม่สามารถย้อนกลับได้
                    </p>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDeleteConfirmFile(null)}
                      className="flex-1"
                    >
                      ยกเลิก
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={async () => {
                        if (!deleteConfirmFile) return;

                        try {
                          const response = await fetch('/api/videos/delete', {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ fileName: deleteConfirmFile.name }),
                          });

                          if (response.ok) {
                            // Remove from list
                            setUploadedVideos(uploadedVideos.filter(v => v.name !== deleteConfirmFile.name));
                            // Remove from selected if it was selected
                            setSelectedExistingVideos(selectedExistingVideos.filter(n => n !== deleteConfirmFile.name));
                            console.log('✅ File deleted successfully');
                            setDeleteConfirmFile(null);
                          } else {
                            const data = await response.json();
                            setError(`ลบไฟล์ไม่สำเร็จ: ${data.error}`);
                            setDeleteConfirmFile(null);
                          }
                        } catch (error) {
                          console.error('Error deleting file:', error);
                          setError('เกิดข้อผิดพลาดในการลบไฟล์');
                          setDeleteConfirmFile(null);
                        }
                      }}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      ลบไฟล์
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary transition-colors">
                <label htmlFor="media-upload" className="cursor-pointer">
                  <Upload className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-medium text-foreground mb-1">
                    อัปโหลดวิดีโอหรือรูปภาพ (ทีละไฟล์)
                  </p>
                  <p className="text-xs text-gray-600">วิดีโอ: MP4, WebM | รูปภาพ: JPG, PNG (สูงสุด 1.5GB)</p>
                  <input
                    id="media-upload"
                    type="file"
                    accept="video/*,image/*"
                    onChange={handleMediaUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Display selected media file */}
              {formData.mediaFile && (
                <div className="mt-4">
                  {/* 2 Column Layout for Video + Thumbnail */}
                  {formData.mediaFile.type.startsWith('video/') ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Video File */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          ไฟล์ที่เลือก:
                        </p>
                        <div className="flex items-center justify-between p-2 bg-muted rounded-lg border border-border min-h-[64px]">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                              <span className="text-blue-600 text-xs font-bold">🎬</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{formData.mediaFile.name}</p>
                              <p className="text-xs text-muted-foreground">
                                วิดีโอ • {(formData.mediaFile.size / (1024 * 1024)).toFixed(2)} MB
                              </p>
                            </div>
                            {uploadProgress[formData.mediaFile.name] !== undefined && (
                              <div className="flex-shrink-0">
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full transition-all"
                                    style={{ width: `${uploadProgress[formData.mediaFile.name]}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={handleRemoveMedia}
                            className="flex-shrink-0 text-red-600 hover:text-red-800"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      {/* Right: Thumbnail */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          ภาพขนาดย่อ (ไม่บังคับ)
                        </p>
                        {!formData.thumbnailFile ? (
                          <div className="border-2 border-dashed border-border rounded-lg p-3 text-center hover:border-primary transition-colors flex flex-col items-center justify-center min-h-[64px]">
                            <label htmlFor="thumbnail-upload" className="cursor-pointer">
                              <FileImage className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">
                                อัปโหลดภาพขนาดย่อ
                              </p>
                              <p className="text-[10px] text-gray-500 mt-0.5">1200x628px</p>
                              <input
                                id="thumbnail-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleThumbnailUpload}
                                className="hidden"
                              />
                            </label>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200 min-h-[64px]">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                                <FileImage className="h-4 w-4 text-green-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-900 truncate">{formData.thumbnailFile.name}</p>
                                <p className="text-[10px] text-gray-500">
                                  {(formData.thumbnailFile.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={handleRemoveThumbnail}
                              className="flex-shrink-0 text-red-600 hover:text-red-800"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Single Column for Images */
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                          <span className="text-blue-600 text-xs font-bold">🖼️</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{formData.mediaFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            รูปภาพ • {(formData.mediaFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                        {uploadProgress[formData.mediaFile.name] !== undefined && (
                          <div className="flex-shrink-0">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${uploadProgress[formData.mediaFile.name]}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={handleRemoveMedia}
                        className="flex-shrink-0 text-red-600 hover:text-red-800"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Display selected existing files */}
              {selectedExistingVideos.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">ไฟล์จาก Library ({selectedExistingVideos.length}):</p>

                  {/* Check if any selected file is a video */}
                  {selectedExistingVideos.some(name => name.match(/\.(mp4|webm|mov|avi)$/i)) ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Selected Files */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          ไฟล์ที่เลือก:
                        </p>
                        <div className="space-y-2">
                          {selectedExistingVideos.map((videoName) => {
                            const video = uploadedVideos.find(v => v.name === videoName);
                            const isVideo = videoName.match(/\.(mp4|webm|mov|avi)$/i);
                            return (
                              <div key={videoName} className="flex items-center justify-between p-2 bg-primary/10 rounded-lg border border-primary/20">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <div className="flex-shrink-0 w-8 h-8 bg-card rounded overflow-hidden border border-border">
                                    {video ? (
                                      isVideo ? (
                                        <video src={video.path} className="w-full h-full object-cover" muted />
                                      ) : (
                                        <img src={video.path} alt={videoName} className="w-full h-full object-cover" />
                                      )
                                    ) : (
                                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                        {isVideo ? <FileVideo className="h-4 w-4 text-gray-400" /> : <FileImage className="h-4 w-4 text-gray-400" />}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-900 truncate">{videoName}</p>
                                    {video && (
                                      <p className="text-[10px] text-gray-500">
                                        {isVideo ? 'วิดีโอ' : 'รูปภาพ'} • {(video.size / (1024 * 1024)).toFixed(2)} MB
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => setSelectedExistingVideos(selectedExistingVideos.filter(n => n !== videoName))}
                                  className="flex-shrink-0 text-red-600 hover:text-red-800"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right: Thumbnail Upload */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          ภาพขนาดย่อ (ไม่บังคับ)
                        </p>
                        {!formData.thumbnailFile ? (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-blue-400 transition-colors flex flex-col items-center justify-center">
                            <label htmlFor="thumbnail-upload-library" className="cursor-pointer">
                              <FileImage className="h-5 w-5 mx-auto mb-1 text-gray-400" />
                              <p className="text-xs text-gray-600">
                                อัปโหลดภาพขนาดย่อ
                              </p>
                              <p className="text-[10px] text-gray-500 mt-0.5">1200x628px</p>
                              <input
                                id="thumbnail-upload-library"
                                type="file"
                                accept="image/*"
                                onChange={handleThumbnailUpload}
                                className="hidden"
                              />
                            </label>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                                <FileImage className="h-4 w-4 text-green-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-900 truncate">{formData.thumbnailFile.name}</p>
                                <p className="text-[10px] text-gray-500">
                                  {(formData.thumbnailFile.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={handleRemoveThumbnail}
                              className="flex-shrink-0 text-red-600 hover:text-red-800"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Single column for images only */
                    <div className="space-y-2">
                      {selectedExistingVideos.map((videoName) => {
                        const video = uploadedVideos.find(v => v.name === videoName);
                        const isVideo = videoName.match(/\.(mp4|webm|mov|avi)$/i);
                        return (
                          <div key={videoName} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="flex-shrink-0 w-10 h-10 bg-white rounded overflow-hidden border border-gray-200">
                                {video ? (
                                  isVideo ? (
                                    <video src={video.path} className="w-full h-full object-cover" muted />
                                  ) : (
                                    <img src={video.path} alt={videoName} className="w-full h-full object-cover" />
                                  )
                                ) : (
                                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                    {isVideo ? <FileVideo className="h-5 w-5 text-gray-400" /> : <FileImage className="h-5 w-5 text-gray-400" />}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{videoName}</p>
                                {video && (
                                  <p className="text-xs text-gray-500">
                                    {isVideo ? 'วิดีโอ' : 'รูปภาพ'} • {(video.size / (1024 * 1024)).toFixed(2)} MB
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => setSelectedExistingVideos(selectedExistingVideos.filter(n => n !== videoName))}
                              className="flex-shrink-0 text-red-600 hover:text-red-800"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* V2: Product & Target Audience Description */}
            <div className="mt-6 space-y-4">
              <h2 className="text-lg font-bold text-foreground">{t('launch.v2.productInfo', '1.5 Product & Target Audience (V2)')}</h2>

              {/* Product Description */}
              <div>
                <Label htmlFor="product-description" className="text-sm font-medium text-gray-700">
                  {t('launch.v2.productDesc', 'What is your product?')} <span className="text-gray-400">{t('launch.v2.optional', '(Optional)')}</span>
                </Label>
                <textarea
                  id="product-description"
                  value={formData.productDescription}
                  onChange={(e) => setFormData({ ...formData, productDescription: e.target.value })}
                  placeholder={t('launch.v2.productPlaceholder', 'e.g. Imported Korean cosmetics, affordable, good quality, helps whiten skin')}
                  className="w-full mt-2 p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('launch.v2.productNote', 'Describe your product or service to help AI generate more relevant ad copies.')}
                </p>
              </div>

              {/* Target Audience Description */}
              <div>
                <Label htmlFor="target-audience" className="text-sm font-medium text-gray-700">
                  {t('launch.v2.targetAudience', 'Your Target Audience')} <span className="text-gray-400">{t('launch.v2.optional', '(Optional)')}</span>
                </Label>
                <textarea
                  id="target-audience"
                  value={formData.targetAudienceDescription}
                  onChange={(e) => setFormData({ ...formData, targetAudienceDescription: e.target.value })}
                  placeholder={t('launch.v2.targetPlaceholder', 'e.g. Women aged 18-35, interested in beauty, online shopping, living in Bangkok')}
                  className="w-full mt-2 p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('launch.v2.targetNote', 'Specify your target audience to help AI analyze targeting more accurately.')}
                </p>
              </div>
            </div>

            {/* Step 2: Select Ad Account */}
            <div data-step="2">
              <h2 className="text-lg font-bold text-foreground mb-4">{t('launch.step2', '2. Select Ad Account')}</h2>
              {selectedAccounts.length > 0 ? (
                <div className="space-y-2">
                  <Select
                    value={formData.selectedAdAccount}
                    onValueChange={(value) => setFormData({ ...formData, selectedAdAccount: value })}
                  >
                    <SelectTrigger id="ad-account" className="w-full h-12">
                      <SelectValue placeholder={t('launch.selectAdAccount', 'Select Ad Account...')} />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.account_id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{account.name}</span>
                            <span className="text-xs text-gray-500">ID: {account.account_id}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center">
                  <p className="text-sm text-gray-600 mb-3">{t('accounts.noAccounts', 'No ad accounts connected')}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/settings?tab=integrations')}
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    {t('accounts.connectNew', 'Connect New Account')}
                  </Button>
                </div>
              )}
            </div>

            {/* Step 3: Select Campaign Objective */}
            <div>
              <h2 className="text-lg font-bold text-foreground mb-4">{t('launch.step3', '3. Select Campaign Objective')}</h2>
              <div className="space-y-2">
                <Select
                  value={formData.campaignObjective}
                  onValueChange={(value) => setFormData({ ...formData, campaignObjective: value })}
                >
                  <SelectTrigger id="campaign-objective" className="w-full h-12">
                    <SelectValue placeholder={t('launch.selectObjective', 'Select Objective...')} />
                  </SelectTrigger>
                  <SelectContent>
                    {campaignObjectives.map((objective) => (
                      <SelectItem key={objective.id} value={objective.id}>
                        <div className="flex flex-col py-1">
                          <span className="font-medium">{objective.name}</span>
                          <span className="text-xs text-gray-500">{objective.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.campaignObjective === 'OUTCOME_ENGAGEMENT' && (
                  <p className="text-xs text-blue-600 mt-2 font-medium">
                    ℹ️ {t('launch.objective.engagementNote', 'Engagement Campaign')}
                  </p>
                )}
              </div>
            </div>

            {/* Step 4: Select Facebook Pages */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">{t('launch.step4', '4. Select Facebook Page')}</h2>
              {contextPages.length > 0 ? (
                <div className="space-y-3">
                  {/* Dropdown Trigger */}
                  <button
                    type="button"
                    onClick={() => setIsPageDropdownOpen(!isPageDropdownOpen)}
                    className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors bg-white"
                  >
                    <span className="text-sm text-gray-700">
                      {formData.selectedPage
                        ? contextPages.find(p => p.id === formData.selectedPage)?.name || t('launch.selectPage', 'Select Facebook Page...')
                        : t('launch.selectPage', 'Select Facebook Page...')}
                    </span>
                    <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${isPageDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Content */}
                  {isPageDropdownOpen && (
                    <div className="border border-gray-300 rounded-lg shadow-lg bg-white">

                      {/* Search Input */}
                      <div className="p-3 border-b border-gray-200">
                        <Input
                          type="text"
                          placeholder={t('campaigns.search', 'Search...')}
                          value={pageSearchQuery}
                          onChange={(e) => setPageSearchQuery(e.target.value)}
                          className="h-10"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      {/* Pages List */}
                      <div className="max-h-64 overflow-y-auto">
                        {filteredPages.length > 0 ? (
                          filteredPages.map((page) => (
                            <div
                              key={page.id}
                              className="flex items-center justify-between p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer last:border-b-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePageSelect(page.id);
                              }}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <input
                                  type="radio"
                                  checked={formData.selectedPage === page.id}
                                  onChange={() => { }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-4 h-4 text-blue-600 border-gray-300 pointer-events-none"
                                />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">{page.name}</p>
                                  <p className="text-xs text-gray-500">ID: {page.id}</p>
                                </div>
                              </div>
                              {formData.selectedPage === page.id && (
                                <span className="text-blue-600 text-sm font-medium">✓</span>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="p-6 text-center text-gray-500 text-sm">
                            {t('campaigns.noMatch', 'No pages found')}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center">
                  <p className="text-sm text-gray-600 mb-3">{t('accounts.noAccounts', 'No pages connected')}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/settings?tab=integrations')}
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    {t('accounts.connectNew', 'Connect New Page')}
                  </Button>
                </div>
              )}
            </div>

            {/* Step 5: Set Budget */}
            <div>
              <h2 className="text-lg font-bold text-foreground mb-4">{t('launch.step5', '5. Set Budget')}</h2>
              <div className="space-y-4">
                {/* Budget Type and Amount - 2 Column Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="budget-type" className="text-sm font-medium text-muted-foreground mb-2 block">
                      {t('launch.budgetType', 'Budget Type')}
                    </Label>
                    <select
                      id="budget-type"
                      value={formData.budgetType}
                      onChange={(e) => setFormData({ ...formData, budgetType: e.target.value as 'daily' | 'lifetime' })}
                      className="w-full h-12 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="daily">{t('launch.dailyBudget')}</option>
                      <option value="lifetime">{t('launch.lifetimeBudget')}</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="budget-input" className="text-sm font-medium text-muted-foreground mb-2 block">
                      {formData.budgetType === 'daily' ? t('launch.dailyBudget') : t('launch.lifetimeBudget')}
                    </Label>
                    <Input
                      id="budget-input"
                      type="number"
                      min="1"
                      step="1"
                      value={formData.budgetType === 'daily' ? formData.dailyBudget : formData.lifetimeBudget}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        if (formData.budgetType === 'daily') {
                          setFormData({ ...formData, dailyBudget: value });
                        } else {
                          setFormData({ ...formData, lifetimeBudget: value });
                        }
                      }}
                      className="h-12 text-lg font-semibold"
                      placeholder={t('launch.amount', 'Amount')}
                    />
                  </div>
                </div>

                {/* Lifetime Budget Schedule */}
                {formData.budgetType === 'lifetime' && (
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-4">
                    <h3 className="text-sm font-semibold text-foreground">กำหนดช่วงเวลาแสดงโฆษณา</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="start-time" className="text-sm font-medium text-muted-foreground mb-2 block">
                          {t('launch.startDate', 'Start Date')}
                        </Label>
                        <Input
                          id="start-time"
                          type="datetime-local"
                          value={formData.startTime || ''}
                          onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                          className="h-10"
                        />
                      </div>

                      <div>
                        <Label htmlFor="end-time" className="text-sm font-medium text-muted-foreground mb-2 block">
                          {t('launch.endDate', 'End Date')}
                        </Label>
                        <Input
                          id="end-time"
                          type="datetime-local"
                          value={formData.endTime || ''}
                          onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                          className="h-10"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="timezone-type" className="text-sm font-medium text-muted-foreground mb-2 block">
                        โซนเวลา
                      </Label>
                      <select
                        id="timezone-type"
                        value={formData.useAudienceTimezone ? 'audience' : 'account'}
                        onChange={(e) => setFormData({ ...formData, useAudienceTimezone: e.target.value === 'audience' })}
                        className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="audience">โซนเวลาผู้ชม</option>
                        <option value="account">โซนเวลาของบัญชีโฆษณา</option>
                      </select>
                    </div>

                    {/* Ad Schedule */}
                    <div className="border-t border-primary/30 pt-4 mt-4">
                      <div className="flex items-start gap-3 mb-3">
                        <input
                          type="checkbox"
                          id="enable-ad-schedule"
                          checked={formData.enableAdSchedule}
                          onChange={(e) => setFormData({ ...formData, enableAdSchedule: e.target.checked })}
                          className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <Label htmlFor="enable-ad-schedule" className="text-sm font-medium text-foreground cursor-pointer">
                            แสดงโฆษณาตามเวลาที่กำหนด
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            ช่วงเวลาที่ใช้ระบุของคนดูเนื้องมอง Messenger ซึ่งพวกเขาอาจเปิดอ่านงมอกกำหนดเองอาจจีดระบุใช้วันนี้
                          </p>
                        </div>
                      </div>

                      {formData.enableAdSchedule && (
                        <div className="mt-4">
                          <Label className="text-sm font-medium text-gray-700 mb-3 block">
                            เวาะรังหมดเนกลาวโฆษณาใช้ช่วงเวลาของคุณตามโซนเวลาของอุตคพิิมิ้หน้าใช้ใช้ช่่งสาอาจบุคนลที่เหัีนใช้ช่วงคา
                          </Label>

                          <div className="mb-3">
                            <select
                              value={formData.useAudienceTimezone ? 'audience' : 'account'}
                              onChange={(e) => setFormData({ ...formData, useAudienceTimezone: e.target.value === 'audience' })}
                              className="w-full md:w-64 h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="audience">ใช้โซนเวลาของผู้ชม</option>
                              <option value="account">ใช้โซนเวลาของบัญชี</option>
                            </select>
                          </div>

                          {/* Time Schedule Grid */}
                          <div className="overflow-x-auto" onMouseUp={() => setIsDragging(false)} onMouseLeave={() => setIsDragging(false)}>
                            <table className="w-full border-collapse text-xs select-none">
                              <thead>
                                <tr>
                                  <th className="border border-gray-300 bg-gray-50 p-2 text-left w-24"></th>
                                  {['0:00', '3:00', '6:00', '9:00', '12:00', '15:00', '18:00', '21:00'].map((time) => (
                                    <th key={time} className="border border-gray-300 bg-gray-50 p-2 text-center">{time}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {['วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์', 'วันอาทิตย์'].map((day, dayIndex) => (
                                  <tr key={day}>
                                    <td className="border border-gray-300 bg-gray-50 p-2 font-medium">{day}</td>
                                    {[0, 3, 6, 9, 12, 15, 18, 21].map((hour) => {
                                      const scheduleKey = `${dayIndex}`;
                                      const isSelected = formData.adSchedule[scheduleKey]?.includes(hour) || false;
                                      return (
                                        <td
                                          key={hour}
                                          className={`border border-gray-300 p-0 cursor-pointer transition-colors ${isSelected ? 'bg-blue-300' : 'bg-white hover:bg-gray-100'
                                            }`}
                                          style={{ width: '40px', height: '40px' }}
                                          onMouseDown={() => {
                                            setIsDragging(true);
                                            setDragMode(isSelected ? 'deselect' : 'select');
                                            const newSchedule = { ...formData.adSchedule };
                                            if (!newSchedule[scheduleKey]) {
                                              newSchedule[scheduleKey] = [];
                                            }
                                            if (isSelected) {
                                              newSchedule[scheduleKey] = newSchedule[scheduleKey].filter(h => h !== hour);
                                            } else {
                                              newSchedule[scheduleKey] = [...newSchedule[scheduleKey], hour];
                                            }
                                            setFormData({ ...formData, adSchedule: newSchedule });
                                          }}
                                          onMouseEnter={() => {
                                            if (isDragging) {
                                              const newSchedule = { ...formData.adSchedule };
                                              if (!newSchedule[scheduleKey]) {
                                                newSchedule[scheduleKey] = [];
                                              }
                                              const currentlySelected = newSchedule[scheduleKey].includes(hour);
                                              if (dragMode === 'select' && !currentlySelected) {
                                                newSchedule[scheduleKey] = [...newSchedule[scheduleKey], hour];
                                                setFormData({ ...formData, adSchedule: newSchedule });
                                              } else if (dragMode === 'deselect' && currentlySelected) {
                                                newSchedule[scheduleKey] = newSchedule[scheduleKey].filter(h => h !== hour);
                                                setFormData({ ...formData, adSchedule: newSchedule });
                                              }
                                            }
                                          }}
                                        >
                                          <div className="w-full h-full"></div>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                                {/* All Days Row */}
                                <tr className="bg-gray-100">
                                  <td className="border border-gray-300 bg-gray-200 p-2 font-bold">ทุกวัน</td>
                                  {[0, 3, 6, 9, 12, 15, 18, 21].map((hour) => {
                                    // Check if all days have this hour selected
                                    const allDaysSelected = [0, 1, 2, 3, 4, 5, 6].every(dayIndex =>
                                      formData.adSchedule[`${dayIndex}`]?.includes(hour)
                                    );
                                    return (
                                      <td
                                        key={hour}
                                        className={`border border-gray-300 p-0 cursor-pointer transition-colors ${allDaysSelected ? 'bg-blue-400' : 'bg-gray-50 hover:bg-gray-200'
                                          }`}
                                        style={{ width: '40px', height: '40px' }}
                                        onMouseDown={() => {
                                          setIsDragging(true);
                                          setDragMode(allDaysSelected ? 'deselect' : 'select');
                                          const newSchedule = { ...formData.adSchedule };
                                          // Toggle all days for this hour
                                          [0, 1, 2, 3, 4, 5, 6].forEach(dayIndex => {
                                            const scheduleKey = `${dayIndex}`;
                                            if (!newSchedule[scheduleKey]) {
                                              newSchedule[scheduleKey] = [];
                                            }
                                            if (allDaysSelected) {
                                              newSchedule[scheduleKey] = newSchedule[scheduleKey].filter(h => h !== hour);
                                            } else {
                                              if (!newSchedule[scheduleKey].includes(hour)) {
                                                newSchedule[scheduleKey] = [...newSchedule[scheduleKey], hour];
                                              }
                                            }
                                          });
                                          setFormData({ ...formData, adSchedule: newSchedule });
                                        }}
                                        onMouseEnter={() => {
                                          if (isDragging) {
                                            const newSchedule = { ...formData.adSchedule };
                                            const currentAllDaysSelected = [0, 1, 2, 3, 4, 5, 6].every(dayIndex =>
                                              newSchedule[`${dayIndex}`]?.includes(hour)
                                            );
                                            [0, 1, 2, 3, 4, 5, 6].forEach(dayIndex => {
                                              const scheduleKey = `${dayIndex}`;
                                              if (!newSchedule[scheduleKey]) {
                                                newSchedule[scheduleKey] = [];
                                              }
                                              if (dragMode === 'select' && !currentAllDaysSelected) {
                                                if (!newSchedule[scheduleKey].includes(hour)) {
                                                  newSchedule[scheduleKey] = [...newSchedule[scheduleKey], hour];
                                                }
                                              } else if (dragMode === 'deselect' && currentAllDaysSelected) {
                                                newSchedule[scheduleKey] = newSchedule[scheduleKey].filter(h => h !== hour);
                                              }
                                            });
                                            setFormData({ ...formData, adSchedule: newSchedule });
                                          }
                                        }}
                                      >
                                        <div className="w-full h-full"></div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                            <span className="inline-block w-3 h-3 bg-blue-100 border border-blue-300"></span>
                            ช่วงเวลาที่กำหนดไว้
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-500">
                  💡 ระบบจะแปลงเป็นสกุลเงินของ Ad Account โดยอัตโนมัติ
                </p>
              </div>
            </div>

            {/* Step 6: Campaign Structure - This is now Step 6 instead of 7 */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">{t('launch.step6', '6. Campaign Structure')}</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="campaign-count" className="text-sm font-medium text-gray-700">
                    {t('launch.campaigns', 'Campaigns')}
                  </Label>
                  <Input
                    id="campaign-count"
                    type="number"
                    min="1"
                    max="1"
                    value={formData.campaignCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setFormData({
                        ...formData,
                        campaignCount: Math.max(1, Math.min(1, val))
                      });
                    }}
                    className="h-12 text-center text-lg font-semibold"
                  />
                </div>
                <div>
                  <Label htmlFor="adset-count" className="text-sm font-medium text-gray-700">
                    {t('launch.adsets', 'AdSets')}
                  </Label>
                  <Input
                    id="adset-count"
                    type="number"
                    min="1"
                    value={formData.adSetCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      const newAdSetCount = Math.max(formData.campaignCount, val);
                      setFormData({
                        ...formData,
                        adSetCount: newAdSetCount,
                        adsCount: Math.max(newAdSetCount, formData.adsCount)
                      });
                    }}
                    className="h-12 text-center text-lg font-semibold"
                  />
                </div>
                <div>
                  <Label htmlFor="ads-count" className="text-sm font-medium text-gray-700">
                    {t('launch.ads', 'Ads')}
                  </Label>
                  <Input
                    id="ads-count"
                    type="number"
                    min="1"
                    value={formData.adsCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setFormData({
                        ...formData,
                        adsCount: Math.max(formData.adSetCount, val)
                      });
                    }}
                    className="h-12 text-center text-lg font-semibold"
                  />
                </div>
              </div>

              <p className="text-sm text-gray-600 mt-3">
                {t('launch.structureNote', 'Will create {campaigns} Campaign, {adsets} AdSets, and {ads} Ads')
                  .replace('{campaigns}', formData.campaignCount.toString())
                  .replace('{adsets}', formData.adSetCount.toString())
                  .replace('{ads}', formData.adsCount.toString())}
              </p>
            </div>

            {/* Step 7: Beneficiary (v2 has this as step 7) */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">{t('launch.step7', '7. Beneficiary Info (Thailand Only) *')}</h2>
              <div>
                <Label htmlFor="beneficiary-select" className="text-sm font-medium text-gray-700 mb-2 block">
                  {t('launch.beneficiary.select', 'Select Beneficiary')}
                </Label>

                {loadingBeneficiaries ? (
                  <div className="h-12 flex items-center justify-center border border-gray-300 rounded-lg bg-gray-50">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">{t('launch.beneficiary.loading', 'Loading...')}</span>
                  </div>
                ) : beneficiaries.length > 0 ? (
                  <Select
                    value={formData.beneficiaryName}
                    onValueChange={(value) => setFormData({ ...formData, beneficiaryName: value })}
                  >
                    <SelectTrigger id="beneficiary-select" className="w-full h-12">
                      <SelectValue placeholder={t('launch.beneficiary.select', 'Select Beneficiary...')} />
                    </SelectTrigger>
                    <SelectContent>
                      {beneficiaries.map((beneficiary) => (
                        <SelectItem key={beneficiary.id} value={beneficiary.id}>
                          <div className="flex flex-col py-1">
                            <span className="font-medium">{beneficiary.name}</span>
                            <span className="text-xs text-gray-500">ID: {beneficiary.id}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-4 border border-yellow-300 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-800 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {t('launch.beneficiary.notFound', 'No Beneficiary found - Please set up in Meta Ads Manager')}
                    </p>
                  </div>
                )}

                <p className="text-xs text-gray-600 mt-2">
                  {t('launch.beneficiary.note', 'According to Thai law, a Verified Beneficiary is required.')}
                </p>
                {beneficiaries.length > 0 && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {t('launch.beneficiary.found', 'Found {count} Beneficiary from Ad Account').replace('{count}', beneficiaries.length.toString())}
                  </p>
                )}
                <p className="text-xs text-blue-600 mt-1">
                  {t('launch.beneficiary.info', 'See more at Meta Ads Manager > Settings > Page Transparency')}
                </p>
              </div>
            </div>

            {/* AI Auto Note */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg">🤖</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">{t('launch.ai.autoTitle', 'AI will manage automatically')}</h3>
                  <ul className="text-xs text-gray-700 space-y-1">
                    <li>✓ {t('launch.ai.autoList1', 'Create campaign in Facebook Ads Manager')}</li>
                    <li>✓ {t('launch.ai.autoList2', 'Upload videos to Facebook')}</li>
                    <li>✓ {t('launch.ai.autoList3', 'Create Ad Creative and copy')}</li>
                    <li>✓ {t('launch.ai.autoList4', 'Set Targeting and Budget')}</li>
                    <li>✓ {t('launch.ai.autoList5', 'Activate ads immediately')}</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Start Button */}
            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="border-gray-300 text-gray-900 hover:bg-gray-50"
              >
                {t('launch.cancel', 'Cancel')}
              </Button>
              <Button
                onClick={handleStart}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-11"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('launch.progress.campaign', 'Creating Campaign...')}
                  </>
                ) : (
                  t('launch.createAndRun', 'Create & Run Campaign')
                )}
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center pt-4">
              {t('launch.ai.footer', 'AI will automatically generate optimized copies, create variations, and manage your campaigns')}
            </p>
          </div>
        </div>
      </div>

      {/* Floating AI Chat Widget */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="mb-4 w-[350px] h-[450px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
            >
              {/* Chat Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t('launch.chat.assistant', 'AI Assistant')}</p>
                    <p className="text-xs text-blue-100">{t('launch.chat.subtitle', 'Ready to help')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {chatMessages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm'
                        }`}
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
                {isAiTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-2 shadow-sm">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={chatMessagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-3 bg-white border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                    placeholder={t('launch.chat.placeholder', 'Type a message...')}
                    className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleChatSend}
                    disabled={!chatInput.trim() || isAiTyping}
                    className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Bubble Button */}
        <motion.button
          onClick={() => setIsChatOpen(!isChatOpen)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors ${isChatOpen
            ? 'bg-gray-600 hover:bg-gray-700'
            : 'bg-blue-600 hover:bg-blue-700'
            }`}
        >
          {isChatOpen ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <MessageCircle className="h-6 w-6 text-white" />
          )}
        </motion.button>
      </div>
    </div>
  );
}
