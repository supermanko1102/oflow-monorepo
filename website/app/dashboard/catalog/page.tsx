"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { mockCatalogItems } from "@/lib/mock-data";
import type { CatalogItem, CatalogItemType } from "@/lib/types";
import { Plus, Upload, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>(mockCatalogItems);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNewItem, setIsNewItem] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    type: "product" as CatalogItemType,
    price: "",
    description: "",
    active: true,
    imageUrl: "",
  });

  const handleEditClick = (item: CatalogItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      type: item.type,
      price: item.price.toString(),
      description: item.description || "",
      active: item.active,
      imageUrl: "", // 假資料沒有圖片
    });
    setIsNewItem(false);
    setIsDialogOpen(true);
  };

  const handleNewClick = () => {
    setSelectedItem(null);
    setFormData({
      name: "",
      type: "product",
      price: "",
      description: "",
      active: true,
      imageUrl: "",
    });
    setIsNewItem(true);
    setIsDialogOpen(true);
  };

  const handleImageUpload = () => {
    // 模擬圖片上傳
    const mockImageUrl = `https://picsum.photos/400/400?random=${Date.now()}`;
    setFormData({ ...formData, imageUrl: mockImageUrl });
    toast.success("圖片已上傳");
  };

  const handleSave = () => {
    if (isNewItem) {
      // 新增商品
      const newItem: CatalogItem = {
        id: `item_${Date.now()}`,
        orgId: "org_1",
        type: formData.type,
        name: formData.name,
        price: parseFloat(formData.price),
        description: formData.description,
        active: formData.active,
      };
      setItems([...items, newItem]);
      toast.success(`商品「${formData.name}」已新增`);
    } else if (selectedItem) {
      // 更新商品
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItem.id
            ? {
                ...item,
                name: formData.name,
                type: formData.type,
                price: parseFloat(formData.price),
                description: formData.description,
                active: formData.active,
              }
            : item
        )
      );
      toast.success(`商品「${formData.name}」已更新`);
    }
    setIsDialogOpen(false);
  };

  const toggleActive = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, active: !item.active } : item
      )
    );
    if (item) {
      toast.success(`商品「${item.name}」已${!item.active ? "啟用" : "停用"}`);
    }
  };

  return (
    <div className="space-y-4 p-4">
      {/* 頂部標題 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">商品管理</h1>
      </div>

      {/* 商品 Grid */}
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <Card
            key={item.id}
            className="p-4 transition-all hover:shadow-md active:scale-[0.98]"
            onClick={() => handleEditClick(item)}
          >
            <div className="space-y-3">
              {/* 商品圖片佔位 */}
              <div className="aspect-square w-full rounded-lg bg-neutral-100" />

              {/* 商品資訊 */}
              <div className="space-y-2">
                <h3 className="line-clamp-2 text-sm font-semibold text-neutral-900">
                  {item.name}
                </h3>
                <p className="text-lg font-bold text-blue-600">${item.price}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">
                    {item.type === "product" ? "商品" : "服務"}
                  </span>
                  <Switch
                    checked={item.active}
                    onCheckedChange={(e) => {
                      e.stopPropagation();
                      toggleActive(item.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 浮動新增按鈕 */}
      <Button
        size="lg"
        className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg"
        onClick={handleNewClick}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* 編輯/新增 Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNewItem ? "新增商品" : "編輯商品"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 商品圖片 */}
            <div className="space-y-2">
              <Label>商品圖片</Label>
              <div
                className="group relative flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-neutral-200 bg-neutral-50 transition-colors hover:border-neutral-300 hover:bg-neutral-100"
                onClick={handleImageUpload}
              >
                {formData.imageUrl ? (
                  <>
                    <img
                      src={formData.imageUrl}
                      alt="商品預覽"
                      className="h-full w-full object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute right-2 top-2 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormData({ ...formData, imageUrl: "" });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-neutral-500">
                    <Upload className="h-8 w-8" />
                    <p className="text-sm">點擊上傳圖片</p>
                  </div>
                )}
              </div>
            </div>

            {/* 商品名稱 */}
            <div className="space-y-2">
              <Label htmlFor="name">商品名稱</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="例：原味巴斯克蛋糕"
              />
            </div>

            {/* 類型 */}
            <div className="space-y-2">
              <Label htmlFor="type">類型</Label>
              <Select
                value={formData.type}
                onValueChange={(value: CatalogItemType) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">商品</SelectItem>
                  <SelectItem value="service">服務</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 價格 */}
            <div className="space-y-2">
              <Label htmlFor="price">價格</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                placeholder="450"
              />
            </div>

            {/* 描述 */}
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="商品描述..."
                rows={3}
              />
            </div>

            {/* 啟用狀態 */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>啟用狀態</Label>
                <p className="text-sm text-neutral-500">啟用後顧客可以下單</p>
              </div>
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, active: checked })
                }
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={!formData.name || !formData.price}
            >
              儲存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
