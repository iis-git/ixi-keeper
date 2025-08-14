import React from 'react';
import { useParams } from 'react-router-dom';
import { ProductForm } from '../../../features/product/edit';

const ProductFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const productId = id ? parseInt(id, 10) : undefined;

  return <ProductForm productId={productId} />;
};

export default ProductFormPage;
