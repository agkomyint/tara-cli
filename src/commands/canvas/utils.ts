export function calculateNextPosition(nodes: any[], inputX?: number, inputY?: number): { x: number; y: number } {
  let finalX = inputX;
  let finalY = inputY;
  
  if (finalX === undefined || finalY === undefined) {
    if (!nodes || nodes.length === 0) {
      finalX = finalX ?? 160;
      finalY = finalY ?? 160;
    } else {
      let maxY = -Infinity;
      let targetX = 160;
      for (const node of nodes) {
        const bottom = (node.y || 0) + (node.height || 340);
        if (bottom > maxY) {
          maxY = bottom;
          targetX = node.x || 160;
        }
      }
      finalX = finalX ?? targetX;
      finalY = finalY ?? (maxY + 40);
    }
  }
  
  return { x: finalX, y: finalY };
}
