import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Users, Building2, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent } from '@/components/ui';
import { Link } from 'react-router-dom';

interface Node { id:string; name:string; parent_id:string|null; type:string; level:number; area:string; description:string; color:string; sort_order:number; }
interface Profile { id:string; role_label:string; area:string; seniority:string; mission:string; org_node_id:string; employees:any[]; }

export default function Organigrama() {
  const { data, isLoading } = useQuery<{ok:boolean;nodes:Node[];profiles:Profile[]}>({
    queryKey: ['orgchart'],
    queryFn: () => api.get('/orgchart'),
  });
  if (isLoading || !data) return <PageContent><Spinner/></PageContent>;

  const nodesById = Object.fromEntries(data.nodes.map(n=>[n.id, n]));
  const children: Record<string,Node[]> = {};
  data.nodes.forEach(n=>{ if(n.parent_id){ (children[n.parent_id]=children[n.parent_id]||[]).push(n); }});
  const profilesByNode: Record<string,Profile[]> = {};
  data.profiles.forEach(p=>{ if(p.org_node_id){ (profilesByNode[p.org_node_id]=profilesByNode[p.org_node_id]||[]).push(p); }});
  const roots = data.nodes.filter(n=>!n.parent_id);

  const renderNode = (node: Node, depth: number = 0) => (
    <div key={node.id} className="mb-2">
      <div className="flex items-center gap-2 p-3 rounded-lg border" style={{ borderLeftColor: node.color, borderLeftWidth: 4, marginLeft: depth*20 }}>
        <Building2 size={16} style={{ color: node.color }}/>
        <div className="flex-1">
          <h4 className="font-bold text-sm text-gray-900">{node.name}</h4>
          {node.description && <p className="text-[11px] text-gray-500">{node.description}</p>}
        </div>
        <span className="text-[10px] text-gray-400 uppercase">{node.type}</span>
      </div>
      {(profilesByNode[node.id]||[]).map(p => (
        <Link key={p.id} to={`/puestos/${p.id}`} className="block ml-12 mt-1 p-2 bg-gray-50 rounded-lg hover:bg-dassa-celeste-tint border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-gray-800">{p.role_label}</div>
              <div className="text-[10px] text-gray-500">{p.seniority} · {p.employees.length} empleado(s)</div>
            </div>
            <ChevronRight size={12} className="text-gray-400"/>
          </div>
        </Link>
      ))}
      {(children[node.id]||[]).map(child => renderNode(child, depth+1))}
    </div>
  );

  return (
    <PageContent>
      <Header title="🏛️ Organigrama" subtitle={`${data.nodes.length} nodos · ${data.profiles.length} puestos · navegable`} icon={<Users size={20}/>}/>
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        {roots.map(r => renderNode(r, 0))}
      </div>
    </PageContent>
  );
}
