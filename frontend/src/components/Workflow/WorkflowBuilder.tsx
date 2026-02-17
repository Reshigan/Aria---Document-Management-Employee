/**
 * Visual Workflow Builder - Drag & Drop Interface
 * Modern no-code workflow automation
 */
import React, { useState } from 'react';
import { Zap, Plus, Play, Save, Settings } from 'lucide-react';

interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
}

export const WorkflowBuilder: React.FC = () => {
  const [nodes, setNodes] = useState<WorkflowNode[]>([
    { id: '1', type: 'trigger', label: 'Document Uploaded', position: { x: 100, y: 100 } }
  ]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const nodeTypes = [
    { type: 'trigger', label: 'Trigger', icon: '⚡', color: 'blue' },
    { type: 'action', label: 'Action', icon: '⚙️', color: 'purple' },
    { type: 'condition', label: 'Condition', icon: '🔀', color: 'orange' },
    { type: 'agent', label: 'Run Agent', icon: '🤖', color: 'green' }
  ];

  const addNode = (type: string) => {
    const newNode: WorkflowNode = {
      id: Date.now().toString(),
      type,
      label: `New ${type}`,
      position: { x: 200, y: nodes.length * 100 + 100 }
    };
    setNodes([...nodes, newNode]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Zap className="text-purple-600" />
              Workflow Builder
            </h1>
            <p className="text-gray-600 mt-1">Create automated workflows with drag & drop</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition flex items-center gap-2">
              <Play className="w-4 h-4" />
              Test
            </button>
            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:shadow-md transition flex items-center gap-2">
              <Save className="w-4 h-4" />
              Save Workflow
            </button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-6">
          {/* Sidebar - Node Types */}
          <div className="col-span-1 space-y-4">
            <div className="bg-white rounded-2xl shadow-xl p-4">
              <h3 className="font-bold mb-3">Components</h3>
              <div className="space-y-2">
                {nodeTypes.map((nodeType) => (
                  <button
                    key={nodeType.type}
                    onClick={() => addNode(nodeType.type)}
                    className="w-full p-3 bg-gradient-to-r from-slate-50 to-purple-50 rounded-lg hover:shadow-md transition text-left flex items-center gap-2"
                  >
                    <span className="text-xl">{nodeType.icon}</span>
                    <span className="text-sm font-medium">{nodeType.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pre-built Templates */}
            <div className="bg-white rounded-2xl shadow-xl p-4">
              <h3 className="font-bold mb-3">Templates</h3>
              <div className="space-y-2">
                <button className="w-full p-2 text-left text-sm hover:bg-purple-50 rounded">
                  🧾 Invoice Flow
                </button>
                <button className="w-full p-2 text-left text-sm hover:bg-purple-50 rounded">
                  📜 Contract Review
                </button>
                <button className="w-full p-2 text-left text-sm hover:bg-purple-50 rounded">
                  📁 Auto-Classify
                </button>
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="col-span-3 bg-white rounded-2xl shadow-xl p-6 min-h-[600px] relative">
            <div className="absolute inset-0 bg-grid-pattern opacity-5" />
            <div className="relative">
              {nodes.map((node, index) => (
                <div key={node.id} className="mb-4">
                  <div
                    className={`p-4 rounded-xl shadow-lg border-2 cursor-pointer transition ${
                      selectedNode === node.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 bg-white hover:shadow-xl'
                    }`}
                    onClick={() => setSelectedNode(node.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white text-xl">
                          {node.type === 'trigger' ? '⚡' : node.type === 'agent' ? '🤖' : '⚙️'}
                        </div>
                        <div>
                          <div className="font-semibold">{node.label}</div>
                          <div className="text-xs text-gray-500">{node.type}</div>
                        </div>
                      </div>
                      <Settings className="w-5 h-5 text-gray-300" />
                    </div>
                  </div>
                  {index < nodes.length - 1 && (
                    <div className="flex justify-center my-2">
                      <div className="w-0.5 h-8 bg-gradient-to-b from-purple-400 to-blue-400" />
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={() => addNode('action')}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition flex items-center justify-center gap-2 text-gray-500"
              >
                <Plus className="w-5 h-5" />
                Add Step
              </button>
            </div>
          </div>

          {/* Properties Panel */}
          <div className="col-span-1 bg-white rounded-2xl shadow-xl p-4">
            <h3 className="font-bold mb-3">Properties</h3>
            {selectedNode ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-600">Node Name</label>
                  <input
                    type="text"
                    className="w-full mt-1 px-3 py-2 border rounded-lg"
                    defaultValue={nodes.find(n => n.id === selectedNode)?.label}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Configuration</label>
                  <textarea
                    className="w-full mt-1 px-3 py-2 border rounded-lg"
                    rows={4}
                    placeholder="JSON config..."
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Select a node to edit properties</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowBuilder;
