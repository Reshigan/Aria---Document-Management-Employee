import { create } from 'zustand'
import type { Document } from '@/types'

interface DocumentsState {
  documents: Document[]
  selectedDocument: Document | null
  isLoading: boolean
  error: string | null
  searchQuery: string
  filterCategory: string
  sortBy: 'name' | 'date' | 'size'
  sortOrder: 'asc' | 'desc'
}

interface DocumentsActions {
  fetchDocuments: () => Promise<void>
  uploadDocument: (file: File) => Promise<void>
  addDocument: (document: Document) => void
  deleteDocument: (id: string) => void
  selectDocument: (document: Document | null) => void
  setSearchQuery: (query: string) => void
  setFilterCategory: (category: string) => void
  setSorting: (sortBy: 'name' | 'date' | 'size', sortOrder: 'asc' | 'desc') => void
  clearError: () => void
}

type DocumentsStore = DocumentsState & DocumentsActions

const useDocumentsStore = create<DocumentsStore>((set, get) => ({
  // State
  documents: [
    {
      id: '1',
      name: 'Annual Report 2024.pdf',
      type: 'application/pdf',
      size: 2048576,
      uploadedAt: '2024-10-15T10:30:00Z',
      uploadedBy: 'John Doe',
      status: 'processed',
      tags: ['report', 'annual', '2024']
    },
    {
      id: '2',
      name: 'Employee Handbook.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 1536000,
      uploadedAt: '2024-10-14T14:20:00Z',
      uploadedBy: 'Jane Smith',
      status: 'processed',
      tags: ['handbook', 'hr', 'policies']
    },
    {
      id: '3',
      name: 'Project Proposal.pdf',
      type: 'application/pdf',
      size: 3072000,
      uploadedAt: '2024-10-13T09:15:00Z',
      uploadedBy: 'Mike Johnson',
      status: 'processing',
      tags: ['proposal', 'project']
    },
    {
      id: '4',
      name: 'Company Logo.png',
      type: 'image/png',
      size: 512000,
      uploadedAt: '2024-10-12T16:45:00Z',
      uploadedBy: 'Sarah Wilson',
      status: 'processed',
      tags: ['logo', 'branding']
    },
    {
      id: '5',
      name: 'Budget Spreadsheet.xlsx',
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 1024000,
      uploadedAt: '2024-10-11T11:30:00Z',
      uploadedBy: 'David Brown',
      status: 'failed',
      tags: ['budget', 'finance']
    }
  ],
  selectedDocument: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  filterCategory: 'all',
  sortBy: 'date',
  sortOrder: 'desc',

  // Actions
  fetchDocuments: async () => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch('/api/documents')
      if (!response.ok) {
        throw new Error('Failed to fetch documents')
      }
      
      const documents = await response.json()
      set({ documents, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch documents',
        isLoading: false,
      })
    }
  },

  uploadDocument: async (file: File) => {
    set({ isLoading: true, error: null })
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        throw new Error('Failed to upload document')
      }
      
      const newDocument = await response.json()
      set(state => ({
        documents: [newDocument, ...state.documents],
        isLoading: false,
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to upload document',
        isLoading: false,
      })
      throw error
    }
  },

  addDocument: (document: Document) => {
    set(state => ({
      documents: [document, ...state.documents]
    }))
  },

  deleteDocument: (id: string) => {
    set(state => ({
      documents: state.documents.filter(doc => doc.id !== id),
      selectedDocument: state.selectedDocument?.id === id ? null : state.selectedDocument,
    }))
  },

  selectDocument: (document: Document | null) => {
    set({ selectedDocument: document })
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query })
  },

  setFilterCategory: (category: string) => {
    set({ filterCategory: category })
  },

  setSorting: (sortBy: 'name' | 'date' | 'size', sortOrder: 'asc' | 'desc') => {
    set({ sortBy, sortOrder })
  },

  clearError: () => {
    set({ error: null })
  },
}))

export { useDocumentsStore }
export default useDocumentsStore