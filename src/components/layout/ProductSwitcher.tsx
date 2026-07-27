"use client";

import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Layers, Building2, Check, ChevronDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

function useActiveProduct(products: Product[]): string | null {
  const pathname = usePathname();
  for (const p of products) {
    if (pathname.startsWith(`/${p.slug}`)) return p.slug;
  }
  return null;
}

export function ProductSwitcher() {
  const router = useRouter();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products-switcher"],
    queryFn: () => fetch("/api/products").then((r) => r.json()),
    staleTime: 60_000,
  });

  const activeSlug = useActiveProduct(products);
  const activeProduct = products.find((p) => p.slug === activeSlug) ?? null;
  const isCraftX = !activeSlug;
  const currentLabel = isCraftX ? "CraftX Admin" : (activeProduct?.name ?? "Unknown");

  function navigate(slug: string | null) {
    router.push(slug ? `/${slug}` : "/");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 h-8 max-w-[200px] border-dashed text-xs"
        >
          <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">{currentLabel}</span>
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Switch Product
        </DropdownMenuLabel>

        {/* CraftX Admin (always first) */}
        <DropdownMenuItem
          onClick={() => navigate(null)}
          className={cn("gap-3 cursor-pointer", isCraftX && "bg-accent")}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">CraftX Admin</p>
            <p className="text-[10px] text-muted-foreground">Internal dashboard</p>
          </div>
          {isCraftX && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
        </DropdownMenuItem>

        {products.filter((p) => p.isActive).length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Connected Products
            </DropdownMenuLabel>
            {products
              .filter((p) => p.isActive)
              .map((product) => {
                const isActive = activeSlug === product.slug;
                return (
                  <DropdownMenuItem
                    key={product.id}
                    onClick={() => navigate(product.slug)}
                    className={cn("gap-3 cursor-pointer", isActive && "bg-accent")}
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted border">
                      {product.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.logoUrl}
                          alt={product.name}
                          className="h-5 w-5 rounded object-contain"
                        />
                      ) : (
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{product.name}</p>
                      {product.description && (
                        <p className="text-[10px] text-muted-foreground truncate">{product.description}</p>
                      )}
                    </div>
                    {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </DropdownMenuItem>
                );
              })}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
