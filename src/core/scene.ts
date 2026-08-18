/** 场景基类：管理节点更新与深度排序渲染 */

export interface RenderItem {
  depth: number;
  draw(ctx: CanvasRenderingContext2D): void;
}

export abstract class Scene {
  protected items: RenderItem[] = [];

  abstract update(dt: number): void;

  /** 子类把要画的东西 push 进 items（每帧重建，简单可靠） */
  abstract buildFrame(): void;

  render(ctx: CanvasRenderingContext2D) {
    this.items.length = 0;
    this.buildFrame();
    this.items.sort((a, b) => a.depth - b.depth);
    for (const it of this.items) it.draw(ctx);
  }
}
