import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { PebbleData } from '../types';

interface GraphViewProps {
  pebbles: PebbleData[];
  onNodeClick: (pebble: PebbleData) => void;
}

export const GraphView: React.FC<GraphViewProps> = ({ pebbles, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || pebbles.length === 0) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); 

    // Simulation Data Preparation
    // Mastery Level (Verified) determines size and gravity mass
    const nodes = pebbles.map(p => ({
       ...p, 
       radius: p.isVerified ? 45 : 15, // Big gravity wells for mastered topics
       mass: p.isVerified ? 50 : 5
    }));

    // Generate links based on loose semantic matching (simulated here by char code or just random for demo)
    // In a real app, use vector embeddings. 
    // Here: Verified nodes act as hubs.
    const links: any[] = [];
    const verifiedNodes = nodes.filter(n => n.isVerified);
    const unverifiedNodes = nodes.filter(n => !n.isVerified);

    // If we have hubs, connect little stones to them
    if (verifiedNodes.length > 0) {
        unverifiedNodes.forEach((uvNode, i) => {
             // Connect to a random verified node (simulating clustering)
             const target = verifiedNodes[i % verifiedNodes.length];
             links.push({ source: uvNode.id, target: target.id });
        });
        // Connect hubs to each other weakly
        for(let i=0; i<verifiedNodes.length; i++) {
             for(let j=i+1; j<verifiedNodes.length; j++) {
                  links.push({ source: verifiedNodes[i].id, target: verifiedNodes[j].id, isHubLink: true });
             }
        }
    } else {
        // Fallback: Random chain if no mastery
        for (let i = 0; i < nodes.length - 1; i++) {
            links.push({ source: nodes[i].id, target: nodes[i+1].id });
        }
    }

    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance((d: any) => d.isHubLink ? 300 : 100))
      .force("charge", d3.forceManyBody().strength((d: any) => d.isVerified ? -600 : -100)) // Verified push harder
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius((d: any) => d.radius + 20));

    // Draw Links
    const link = svg.append("g")
      .attr("stroke", "#44403c")
      .attr("stroke-opacity", 0.4)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", (d: any) => d.isHubLink ? 2 : 0.5)
      .attr("stroke-dasharray", (d: any) => d.isHubLink ? "0" : "5,5");

    // Nodes Group
    const node = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Glow Filter for Mastered Nodes
    const defs = svg.append("defs");
    const filter = defs.append("filter").attr("id", "mastery-glow");
    filter.append("feGaussianBlur").attr("stdDeviation", "6").attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Circles
    node.append("circle")
      .attr("r", (d: any) => d.radius)
      .attr("fill", (d: any) => d.isVerified ? "#f5f5f4" : "#292524") // Light for verified (star), Dark for raw (stone)
      .attr("stroke", (d: any) => d.isVerified ? "#fafaf9" : "#57534e")
      .attr("stroke-width", (d: any) => d.isVerified ? 0 : 2)
      .style("filter", (d: any) => d.isVerified ? "url(#mastery-glow)" : "none")
      .style("cursor", "pointer")
      .on("click", (event, d) => onNodeClick(d as unknown as PebbleData));

    // Labels
    node.append("text")
      .text((d: any) => d.topic)
      .attr("text-anchor", "middle")
      .attr("dy", (d: any) => d.radius + 15)
      .attr("font-family", "Inter, sans-serif")
      .attr("font-size", (d: any) => d.isVerified ? "14px" : "10px")
      .attr("font-weight", (d: any) => d.isVerified ? "600" : "400")
      .attr("fill", (d: any) => d.isVerified ? "#fafaf9" : "#a8a29e")
      .style("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => { simulation.stop(); };
  }, [pebbles]);

  return (
    <svg 
      ref={svgRef} 
      className="w-full h-full bg-stone-900"
      style={{ minHeight: '600px' }}
    />
  );
};
