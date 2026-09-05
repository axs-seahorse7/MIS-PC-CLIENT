import { useEffect, useState } from "react";
import { notification } from "antd";
import api from "../../services/API/api"; // adjust path if your folder depth differs

export default function useProducts() {
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setProductsLoading(true);
        const res = await api.get("/products/all");
        setProducts(res?.data?.data || res?.data || []);
      } catch (err) {
        notification.error({
          message: "Failed to load products",
          description: "Could not fetch the product list. Please retry.",
          placement: "topRight",
        });
      } finally {
        setProductsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return { products, productsLoading };
}
