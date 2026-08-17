
/*
  # Seed sample categories, brands, and products

  Inserts:
  - 6 product categories
  - 6 brands
  - 30 sample products, all approved and visible
*/

-- Categories
INSERT INTO categories (id, name, slug, is_active, show_on_homepage, sort_order) VALUES
  ('c1000000-0000-0000-0000-100000000001', 'Spices & Masala',     'spices-masala',      true, true, 1),
  ('c1000000-0000-0000-0000-100000000002', 'Rice & Grains',        'rice-grains',         true, true, 2),
  ('c1000000-0000-0000-0000-100000000003', 'Pickles & Chutneys',   'pickles-chutneys',    true, true, 3),
  ('c1000000-0000-0000-0000-100000000004', 'Snacks & Namkeens',    'snacks-namkeens',     true, true, 4),
  ('c1000000-0000-0000-0000-100000000005', 'Oils & Ghee',          'oils-ghee',           true, true, 5),
  ('c1000000-0000-0000-0000-100000000006', 'Rice Powders & Flour', 'rice-powders-flour',  true, true, 6)
ON CONFLICT (id) DO NOTHING;

-- Brands
INSERT INTO brands (id, name, slug, show_on_homepage, sort_order) VALUES
  ('b1000000-0000-0000-0000-100000000001', 'KTC',          'ktc',          true, 1),
  ('b1000000-0000-0000-0000-100000000002', 'Eastern',      'eastern',      true, 2),
  ('b1000000-0000-0000-0000-100000000003', 'Nirapara',     'nirapara',     true, 3),
  ('b1000000-0000-0000-0000-100000000004', 'Double Horse', 'double-horse', true, 4),
  ('b1000000-0000-0000-0000-100000000005', 'Priya',        'priya',        true, 5),
  ('b1000000-0000-0000-0000-100000000006', 'Aachi',        'aachi',        true, 6)
ON CONFLICT (id) DO NOTHING;

-- Products
INSERT INTO products (
  id, name, slug, description, short_description,
  image_url, category_id, brand_id,
  price, original_price, discount_percentage,
  is_active, is_deleted, is_featured, is_deal, is_new_arrival, is_bestseller,
  approval_status, visibility_status,
  rating, review_count, sold_count,
  created_at, updated_at
) VALUES
  ('a0000000-0001-0000-0000-000000000001','Kerala Garam Masala 200g','kerala-garam-masala-200g','Traditional Kerala-style garam masala blend with cardamom, cloves and cinnamon.','Aromatic whole spice blend','https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&q=80','c1000000-0000-0000-0000-100000000001','b1000000-0000-0000-0000-100000000002',2.99,3.49,14,true,false,true,false,false,true,'approved',true,4.7,128,340,now(),now()),
  ('a0000000-0002-0000-0000-000000000001','Turmeric Powder 400g','turmeric-powder-400g','Pure ground turmeric, deep golden colour and earthy aroma.','100% pure turmeric','https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&q=80','c1000000-0000-0000-0000-100000000001','b1000000-0000-0000-0000-100000000003',1.99,2.49,20,true,false,false,true,false,false,'approved',true,4.5,95,210,now(),now()),
  ('a0000000-0003-0000-0000-000000000001','Coriander Powder 400g','coriander-powder-400g','Finely milled coriander seeds, perfect for curries and marinades.','Freshly milled coriander','https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80','c1000000-0000-0000-0000-100000000001','b1000000-0000-0000-0000-100000000002',1.79,2.29,22,true,false,false,false,true,false,'approved',true,4.3,67,180,now(),now()),
  ('a0000000-0004-0000-0000-000000000001','Red Chilli Powder 500g','red-chilli-powder-500g','Hot Kerala red chilli powder for authentic spice.','Extra hot Kerala chilli','https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80','c1000000-0000-0000-0000-100000000001','b1000000-0000-0000-0000-100000000006',2.49,2.99,17,true,false,false,false,false,true,'approved',true,4.6,112,295,now(),now()),
  ('a0000000-0005-0000-0000-000000000001','Cumin Seeds 250g','cumin-seeds-250g','Whole jeera seeds, aromatic and pungent.','Whole jeera seeds','https://images.unsplash.com/photo-1599420186946-7b6fb4e297f0?w=400&q=80','c1000000-0000-0000-0000-100000000001','b1000000-0000-0000-0000-100000000002',1.49,1.99,25,true,false,false,true,false,false,'approved',true,4.4,54,165,now(),now()),
  ('a0000000-0006-0000-0000-000000000001','Basmati Rice 5kg','basmati-rice-5kg','Premium aged basmati rice, long grain and fluffy.','Premium aged basmati','https://images.unsplash.com/photo-1536304993881-ff86e0c9b915?w=400&q=80','c1000000-0000-0000-0000-100000000002','b1000000-0000-0000-0000-100000000001',8.99,10.99,18,true,false,true,false,false,true,'approved',true,4.8,203,520,now(),now()),
  ('a0000000-0007-0000-0000-000000000001','Ponni Rice 5kg','ponni-rice-5kg','South Indian short-grain Ponni rice, ideal for Kerala meals.','Soft South Indian rice','https://images.unsplash.com/photo-1614961233913-a5113a4a34ed?w=400&q=80','c1000000-0000-0000-0000-100000000002','b1000000-0000-0000-0000-100000000003',7.49,8.99,17,true,false,false,false,true,false,'approved',true,4.6,145,380,now(),now()),
  ('a0000000-0008-0000-0000-000000000001','Matta Rice 2kg','matta-rice-2kg','Kerala red parboiled rice, nutty flavour and nutritious.','Kerala red parboiled rice','https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=400&q=80','c1000000-0000-0000-0000-100000000002','b1000000-0000-0000-0000-100000000004',3.99,4.99,20,true,false,false,false,false,true,'approved',true,4.5,88,240,now(),now()),
  ('a0000000-0009-0000-0000-000000000001','Jeerakasala Rice 1kg','jeerakasala-rice-1kg','Fragrant Kerala biryani rice with a distinctive aroma.','Kerala biryani rice','https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80','c1000000-0000-0000-0000-100000000002','b1000000-0000-0000-0000-100000000003',3.49,3.99,13,true,false,false,false,true,false,'approved',true,4.7,62,190,now(),now()),
  ('a0000000-0010-0000-0000-000000000001','Mango Pickle 500g','mango-pickle-500g','Tangy raw mango pickle in spiced mustard oil.','Classic aam ka achar','https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&q=80','c1000000-0000-0000-0000-100000000003','b1000000-0000-0000-0000-100000000005',3.29,3.99,18,true,false,false,false,false,true,'approved',true,4.6,176,430,now(),now()),
  ('a0000000-0011-0000-0000-000000000001','Lime Pickle 300g','lime-pickle-300g','Zesty Kerala-style lime pickle, fiery and sour.','Kerala lime pickle','https://images.unsplash.com/photo-1604152135912-04a022e23696?w=400&q=80','c1000000-0000-0000-0000-100000000003','b1000000-0000-0000-0000-100000000002',2.79,3.29,15,true,false,false,true,false,false,'approved',true,4.4,92,260,now(),now()),
  ('a0000000-0012-0000-0000-000000000001','Mixed Vegetable Pickle 400g','mixed-vegetable-pickle-400g','Assorted vegetable pickle in spiced oil.','Mixed veg achar','https://images.unsplash.com/photo-1541519227354-08fa5d50c820?w=400&q=80','c1000000-0000-0000-0000-100000000003','b1000000-0000-0000-0000-100000000005',2.99,3.49,14,true,false,false,false,true,false,'approved',true,4.3,58,170,now(),now()),
  ('a0000000-0013-0000-0000-000000000001','Fish Pickle 250g','fish-pickle-250g','Spicy Kerala-style sardine pickle in sesame oil.','Kerala fish pickle','https://images.unsplash.com/photo-1534482421-64566f976cfa?w=400&q=80','c1000000-0000-0000-0000-100000000003','b1000000-0000-0000-0000-100000000004',4.49,5.49,18,true,false,true,false,false,true,'approved',true,4.8,134,310,now(),now()),
  ('a0000000-0014-0000-0000-000000000001','Kerala Banana Chips 200g','kerala-banana-chips-200g','Crispy raw banana chips fried in pure coconut oil.','Coconut oil banana chips','https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&q=80','c1000000-0000-0000-0000-100000000004','b1000000-0000-0000-0000-100000000003',2.49,2.99,17,true,false,true,false,false,true,'approved',true,4.9,287,680,now(),now()),
  ('a0000000-0015-0000-0000-000000000001','Murukku 300g','murukku-300g','Traditional south Indian rice flour spiral snack.','Crispy rice spiral snack','https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&q=80','c1000000-0000-0000-0000-100000000004','b1000000-0000-0000-0000-100000000006',2.29,2.79,18,true,false,false,false,true,false,'approved',true,4.6,98,250,now(),now()),
  ('a0000000-0016-0000-0000-000000000001','Chakka Varetti 250g','chakka-varetti-250g','Sweet jackfruit jam, a Kerala delicacy.','Kerala jackfruit jam','https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&q=80','c1000000-0000-0000-0000-100000000004','b1000000-0000-0000-0000-100000000004',3.49,3.99,13,true,false,false,false,false,false,'approved',true,4.5,73,195,now(),now()),
  ('a0000000-0017-0000-0000-000000000001','Kerala Wheat Halwa 500g','kerala-wheat-halwa-500g','Rich Kerala wheat halwa, sweet and sticky.','Traditional wheat halwa','https://images.unsplash.com/photo-1571167366136-b57e4e6e6ac1?w=400&q=80','c1000000-0000-0000-0000-100000000004','b1000000-0000-0000-0000-100000000003',4.99,5.99,17,true,false,false,true,false,false,'approved',true,4.7,109,280,now(),now()),
  ('a0000000-0018-0000-0000-000000000001','Savoury Mixture 250g','savoury-mixture-250g','Crunchy South Indian savoury snack mixture.','South Indian savoury mix','https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80','c1000000-0000-0000-0000-100000000004','b1000000-0000-0000-0000-100000000006',1.99,2.49,20,true,false,false,false,false,true,'approved',true,4.4,84,220,now(),now()),
  ('a0000000-0019-0000-0000-000000000001','Pure Coconut Oil 500ml','pure-coconut-oil-500ml','Cold-pressed virgin coconut oil for cooking and hair care.','Cold-pressed coconut oil','https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80','c1000000-0000-0000-0000-100000000005','b1000000-0000-0000-0000-100000000004',5.49,6.99,21,true,false,true,false,false,true,'approved',true,4.8,192,470,now(),now()),
  ('a0000000-0020-0000-0000-000000000001','Mustard Oil 1L','mustard-oil-1l','Pungent kachchi ghani mustard oil for pickles and curries.','Pure mustard oil','https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&q=80','c1000000-0000-0000-0000-100000000005','b1000000-0000-0000-0000-100000000001',3.99,4.99,20,true,false,false,false,true,false,'approved',true,4.5,76,200,now(),now()),
  ('a0000000-0021-0000-0000-000000000001','Desi Ghee 500g','desi-ghee-500g','Pure cow ghee, clarified butter with rich aroma.','Pure cow ghee','https://images.unsplash.com/photo-1631125915902-d8abe9225ff2?w=400&q=80','c1000000-0000-0000-0000-100000000005','b1000000-0000-0000-0000-100000000002',8.49,9.99,15,true,false,false,false,false,true,'approved',true,4.9,231,560,now(),now()),
  ('a0000000-0022-0000-0000-000000000001','Sesame Oil 250ml','sesame-oil-250ml','Cold-pressed gingelly oil for South Indian cooking.','Cold-pressed gingelly oil','https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80','c1000000-0000-0000-0000-100000000005','b1000000-0000-0000-0000-100000000005',3.49,3.99,13,true,false,false,true,false,false,'approved',true,4.6,65,175,now(),now()),
  ('a0000000-0023-0000-0000-000000000001','Idiyappam Flour 1kg','idiyappam-flour-1kg','Fine white rice flour for making string hoppers.','String hopper rice flour','https://images.unsplash.com/photo-1612204103590-b58c23d9a8f6?w=400&q=80','c1000000-0000-0000-0000-100000000006','b1000000-0000-0000-0000-100000000003',2.49,2.99,17,true,false,true,false,false,true,'approved',true,4.7,143,370,now(),now()),
  ('a0000000-0024-0000-0000-000000000001','Puttu Podi 1kg','puttu-podi-1kg','Roasted rice powder for traditional Kerala puttu.','Kerala puttu flour','https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80','c1000000-0000-0000-0000-100000000006','b1000000-0000-0000-0000-100000000004',2.29,2.79,18,true,false,false,false,true,false,'approved',true,4.6,118,300,now(),now()),
  ('a0000000-0025-0000-0000-000000000001','Wheat Flour 5kg','wheat-flour-5kg','Fine chakki-ground whole wheat atta for chapati and roti.','Chakki ground atta','https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80','c1000000-0000-0000-0000-100000000006','b1000000-0000-0000-0000-100000000001',5.99,7.49,20,true,false,false,false,false,true,'approved',true,4.5,167,420,now(),now()),
  ('a0000000-0026-0000-0000-000000000001','Chickpea Flour 1kg','chickpea-flour-1kg','Fine besan for pakoras, kadhi and sweets.','Besan gram flour','https://images.unsplash.com/photo-1612204103590-b58c23d9a8f6?w=400&q=80','c1000000-0000-0000-0000-100000000006','b1000000-0000-0000-0000-100000000005',2.19,2.69,19,true,false,false,true,false,false,'approved',true,4.4,52,150,now(),now()),
  ('a0000000-0027-0000-0000-000000000001','Black Pepper 200g','black-pepper-200g','Whole Malabar black pepper, bold and pungent.','Malabar black pepper','https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80','c1000000-0000-0000-0000-100000000001','b1000000-0000-0000-0000-100000000002',3.49,3.99,13,true,false,true,false,false,false,'approved',true,4.7,89,230,now(),now()),
  ('a0000000-0028-0000-0000-000000000001','Green Cardamom 50g','green-cardamom-50g','Green cardamom pods from Kerala highlands, intensely fragrant.','Kerala green cardamom','https://images.unsplash.com/photo-1599420186946-7b6fb4e297f0?w=400&q=80','c1000000-0000-0000-0000-100000000001','b1000000-0000-0000-0000-100000000003',4.99,5.99,17,true,false,false,false,true,true,'approved',true,4.9,204,500,now(),now()),
  ('a0000000-0029-0000-0000-000000000001','Coconut Milk 400ml','coconut-milk-400ml','Creamy canned coconut milk for curries and desserts.','Rich coconut milk','https://images.unsplash.com/photo-1623428187969-5da2dcea5ebf?w=400&q=80','c1000000-0000-0000-0000-100000000005','b1000000-0000-0000-0000-100000000001',1.89,2.29,17,true,false,false,false,false,true,'approved',true,4.6,155,390,now(),now()),
  ('a0000000-0030-0000-0000-000000000001','Kerala Sambar Powder 200g','kerala-sambar-powder-200g','Aromatic sambar masala blend for authentic South Indian dal.','South Indian sambar masala','https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&q=80','c1000000-0000-0000-0000-100000000001','b1000000-0000-0000-0000-100000000006',2.79,3.29,15,true,false,false,false,false,true,'approved',true,4.7,121,310,now(),now())
ON CONFLICT (id) DO NOTHING;
