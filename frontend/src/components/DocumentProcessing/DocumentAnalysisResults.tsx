import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Brain, 
  Eye, 
  Hash, 
  MessageSquare, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertCircle,
  Tag,
  Users,
  Calendar,
  DollarSign,
  Mail,
  Phone,
  Globe
} from 'lucide-react';

interface DocumentAnalysisResultsProps {
  results: {
    ocr?: {
      text: string;
      confidence: number;
      engine: string;
      language: string;
      text_regions?: any[];
      quality_scores?: {
        text_quality: number;
        image_quality: number;
      };
    };
    ai_analysis?: {
      document_type: string;
      confidence: number;
      summary: string;
      entities: Array<{
        type: string;
        value: string;
        confidence: number;
        start?: number;
        end?: number;
      }>;
      sentiment: {
        positive: number;
        negative: number;
        neutral: number;
      };
      topics: Array<{
        topic: string;
        confidence: number;
        keywords: string[];
      }>;
      key_phrases: string[];
      metadata: {
        text_length: number;
        word_count: number;
        sentence_count: number;
        processing_time: number;
      };
    };
  };
  processingTime?: number;
}

const DocumentAnalysisResults: React.FC<DocumentAnalysisResultsProps> = ({
  results,
  processingTime
}) => {
  const { ocr, ai_analysis } = results;

  const getEntityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'person':
      case 'per':
        return <Users className="w-4 h-4" />;
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'phone':
        return <Phone className="w-4 h-4" />;
      case 'date':
        return <Calendar className="w-4 h-4" />;
      case 'money':
      case 'currency':
        return <DollarSign className="w-4 h-4" />;
      case 'url':
        return <Globe className="w-4 h-4" />;
      case 'org':
      case 'organization':
        return <Users className="w-4 h-4" />;
      default:
        return <Tag className="w-4 h-4" />;
    }
  };

  const getDocumentTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'invoice':
        return 'bg-green-100 text-green-800';
      case 'contract':
        return 'bg-blue-100 text-blue-800';
      case 'resume':
        return 'bg-purple-100 text-purple-800';
      case 'report':
        return 'bg-orange-100 text-orange-800';
      case 'email':
        return 'bg-cyan-100 text-cyan-800';
      case 'legal':
        return 'bg-red-100 text-red-800';
      case 'financial':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSentimentColor = (sentiment: string, value: number) => {
    if (value < 0.3) return 'bg-gray-200';
    
    switch (sentiment) {
      case 'positive':
        return 'bg-green-500';
      case 'negative':
        return 'bg-red-500';
      case 'neutral':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {ocr && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Eye className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">OCR Confidence</p>
                  <p className="text-2xl font-bold">
                    {(ocr.confidence * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {ai_analysis && (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Brain className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium">Document Type</p>
                    <Badge className={getDocumentTypeColor(ai_analysis.document_type)}>
                      {ai_analysis.document_type}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Hash className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Word Count</p>
                    <p className="text-2xl font-bold">
                      {ai_analysis.metadata.word_count.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium">Processing Time</p>
                    <p className="text-2xl font-bold">
                      {(processingTime || ai_analysis.metadata.processing_time).toFixed(1)}s
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Detailed Results */}
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="text">Extracted Text</TabsTrigger>
          <TabsTrigger value="entities">Entities</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          {ai_analysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Document Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Classification Confidence:</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={ai_analysis.confidence * 100} className="w-20" />
                      <span className="text-sm">{(ai_analysis.confidence * 100).toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="prose max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      {ai_analysis.summary || 'No summary available.'}
                    </p>
                  </div>

                  {ai_analysis.key_phrases.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Key Phrases:</h4>
                      <div className="flex flex-wrap gap-2">
                        {ai_analysis.key_phrases.map((phrase, index) => (
                          <Badge key={index} variant="secondary">
                            {phrase}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {ocr && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="w-5 h-5" />
                  <span>OCR Results</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Engine:</p>
                    <p className="text-sm text-gray-600">{ocr.engine}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Language:</p>
                    <p className="text-sm text-gray-600">{ocr.language}</p>
                  </div>
                  {ocr.quality_scores && (
                    <>
                      <div>
                        <p className="text-sm font-medium">Text Quality:</p>
                        <div className="flex items-center space-x-2">
                          <Progress value={ocr.quality_scores.text_quality * 100} className="flex-1" />
                          <span className="text-sm">{(ocr.quality_scores.text_quality * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Image Quality:</p>
                        <div className="flex items-center space-x-2">
                          <Progress value={ocr.quality_scores.image_quality * 100} className="flex-1" />
                          <span className="text-sm">{(ocr.quality_scores.image_quality * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="text">
          <Card>
            <CardHeader>
              <CardTitle>Extracted Text</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 w-full rounded border p-4">
                <pre className="whitespace-pre-wrap text-sm">
                  {ocr?.text || 'No text extracted.'}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entities">
          <Card>
            <CardHeader>
              <CardTitle>Named Entities</CardTitle>
            </CardHeader>
            <CardContent>
              {ai_analysis?.entities && ai_analysis.entities.length > 0 ? (
                <div className="space-y-3">
                  {ai_analysis.entities.map((entity, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {getEntityIcon(entity.type)}
                        <div>
                          <p className="font-medium">{entity.value}</p>
                          <p className="text-sm text-gray-500 capitalize">
                            {entity.type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Progress value={entity.confidence * 100} className="w-16" />
                        <span className="text-sm text-gray-500">
                          {(entity.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No entities detected.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sentiment">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5" />
                <span>Sentiment Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ai_analysis?.sentiment ? (
                <div className="space-y-4">
                  {Object.entries(ai_analysis.sentiment).map(([sentiment, value]) => (
                    <div key={sentiment} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium capitalize">
                          {sentiment}
                        </span>
                        <span className="text-sm text-gray-500">
                          {(value * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getSentimentColor(sentiment, value)}`}
                          style={{ width: `${value * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No sentiment analysis available.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="topics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Topic Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ai_analysis?.topics && ai_analysis.topics.length > 0 ? (
                <div className="space-y-4">
                  {ai_analysis.topics.map((topic, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium capitalize">
                          {topic.topic.replace('_', ' ')}
                        </h4>
                        <Badge variant="outline">
                          {(topic.confidence * 100).toFixed(1)}%
                        </Badge>
                      </div>
                      {topic.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {topic.keywords.map((keyword, keyIndex) => (
                            <Badge key={keyIndex} variant="secondary" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No topics identified.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DocumentAnalysisResults;