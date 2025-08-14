import React from 'react';
import { useParams } from 'react-router-dom';
import { CategoryForm } from '../../../features/category/edit';

const CategoryFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const categoryId = id ? parseInt(id, 10) : undefined;

  return <CategoryForm categoryId={categoryId} />;
};

export default CategoryFormPage;
