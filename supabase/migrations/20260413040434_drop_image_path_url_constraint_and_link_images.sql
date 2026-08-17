/*
  # Drop stale image_path URL constraint and link product images from storage

  ## Summary

  ### Problem
  The `products_image_path_no_full_url` check constraint prevents full URLs in
  `image_path`. However, the `sync_image_columns` trigger automatically mirrors
  `image_url` → `image_path` on every update. This means any attempt to set
  a full URL in `image_url` (the intended field) is blocked.

  The constraint was designed for an older architecture where `image_path` held
  relative file paths. The trigger-based sync makes both columns hold the same
  value, so the constraint is now incompatible with how the system works.

  ### Changes
  1. Drop `products_image_path_no_full_url` constraint
  2. Set `image_url` for ~65 products matched to images in the `product-images` bucket

  ### Security
  No RLS changes — existing policies are unaffected.
*/

-- 1. Drop the now-incompatible constraint
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_image_path_no_full_url;

-- 2. Link products to their storage images
DO $$
DECLARE
  base_url TEXT := 'https://icnvrpnzjjcbvgcqgiua.supabase.co/storage/v1/object/public/product-images/';
BEGIN

  UPDATE products SET image_url = base_url || 'DH%20Biriyani%20masala.jpg'
    WHERE id = 'e1c9af8e-46aa-4f7e-8497-f097db4d1bc5';

  UPDATE products SET image_url = base_url || 'dh%20chicken%20masla.jpg'
    WHERE id = '8022da50-852e-4fa8-9d76-6589b5beee02';

  UPDATE products SET image_url = base_url || 'Sakthi%20Fish%20Curry%20Masala.jpg'
    WHERE id = 'ebe71b3c-768f-437e-a291-6a447e8a31be';

  UPDATE products SET image_url = base_url || 'dh%20fish%20masala.jpg'
    WHERE id = '00dae562-8c66-4da2-a206-96b7c4e85d3e';

  UPDATE products SET image_url = base_url || 'meat%20masala.png'
    WHERE id = 'bd0a9296-d87f-4e01-8532-94dd120de1f0';

  UPDATE products SET image_url = base_url || 'chemba%20puttu.png'
    WHERE id = '87ad9c8f-15f5-4bf8-ae5b-4da1cc44497e';

  UPDATE products SET image_url = base_url || 'chickpea.png'
    WHERE id = '7a0d1800-1e62-4c7a-845a-1fe91e75d063';

  UPDATE products SET image_url = base_url || 'cloves.png'
    WHERE id = '1cfe4ade-8a37-44a0-a6bb-c59a4ef69811';

  UPDATE products SET image_url = base_url || 'corainder%20powder%20200g.jpg'
    WHERE id = 'db4cb934-c041-4679-a7f0-23237d7d17e7';

  UPDATE products SET image_url = base_url || 'Coriander%20Seeds%20%28Dhania%29.jpg'
    WHERE id = '0c6d2415-6e42-4316-9c1d-61a9afa49dfe';

  UPDATE products SET image_url = base_url || 'cruched%20chillie%20200g.jpg'
    WHERE id = 'ccab115b-f2dd-4108-b664-bca96a4b49db';

  UPDATE products SET image_url = base_url || 'Tata_Salt_Crystal-1.png'
    WHERE id = 'f1bab104-a2ad-4c7b-ba58-c0f528b266f7';

  UPDATE products SET image_url = base_url || 'cumin.png'
    WHERE id = 'eeb26afb-71bf-42f4-8794-4162d9e3db1f';

  UPDATE products SET image_url = base_url || 'Cumin%20Seeds%20%28Jeera%29%20200G.jpg'
    WHERE id = '7126f8a8-729d-41b5-b260-b7dccd413667';

  UPDATE products SET image_url = base_url || 'dhCut%20Mango%20Pickle%20-%20400g.jpg'
    WHERE id = 'a3df5428-9a44-42ff-8fe2-784236521fac';

  UPDATE products SET image_url = base_url || '777%20Cut%20Mango%20Pickle.jpg'
    WHERE id = 'db27c49e-9578-406d-a378-f1c5c723dc9f';

  UPDATE products SET image_url = base_url || 'dosamix.png'
    WHERE id = '8f3d6209-1584-42a6-a714-f2145e6f72bc';

  UPDATE products SET image_url = base_url || 'Double%20Horse%20Easy%20Mix%20for%20Palappam.jpg'
    WHERE id = '35045aeb-c577-4c32-a70a-e444eab9c5b0';

  UPDATE products SET image_url = base_url || 'dh%20easy%20pathiri%20podi.jpg'
    WHERE id = '4b6eb77e-a017-4fd9-8b73-091b2cabb37a';

  UPDATE products SET image_url = base_url || 'Fennel%20seeds%20200g.jpg'
    WHERE id = 'e25c1333-87ff-4983-a8ac-7f79c1338c01';

  UPDATE products SET image_url = base_url || 'fenugreek%20200g.jpg'
    WHERE id = '1e0756fb-6c91-4c80-a61f-31a9eb497261';

  UPDATE products SET image_url = base_url || '777%20Gingelly%20Oil%201%20L.jpg'
    WHERE id = '61a81062-28ca-420a-8faa-7342de4e2675';

  UPDATE products SET image_url = base_url || 'Dh%20Ginger%20Coffee.jpg'
    WHERE id = 'ef0ce940-7f6a-4ffc-80c2-cd047a6a8c1f';

  UPDATE products SET image_url = base_url || '777%20Ginger%20Pickle.jpg'
    WHERE id = '4cc17d5c-fba1-4f66-9c3f-276865d01583';

  UPDATE products SET image_url = base_url || '777%20Green%20Chilly%20Pickle.jpg'
    WHERE id = 'a868d0ab-e4bf-4a6a-8caf-b71f8d313df6';

  UPDATE products SET image_url = base_url || 'LG%20Asafoetida%20Powder.jpg'
    WHERE id = '0b7ac085-75b4-47e6-9257-999c07f276bc';

  UPDATE products SET image_url = base_url || '777%20Hot%20Onion%20Pickle.jpg'
    WHERE id = '92bbb43c-8a8d-4db2-b21d-4252b1e3593d';

  UPDATE products SET image_url = base_url || 'idly%20mix.png'
    WHERE id = 'dc7c2b0f-6e7d-4f2f-8bfb-9da3f60d2f28';

  UPDATE products SET image_url = base_url || 'Instant%20Parippu%20Pradhaman.jpg'
    WHERE id = '19f23b69-968f-4dd7-9e23-a01e819c313f';

  UPDATE products SET image_url = base_url || 'Inst%20Vermicilli%20Payasam%20Mix.jpg'
    WHERE id = '55c77211-9a46-42ab-acf8-da3e5f1bbe47';

  UPDATE products SET image_url = base_url || 'jack%20chips.png'
    WHERE id = '4a9e967a-762e-4303-8d23-c76f79df605a';

  UPDATE products SET image_url = base_url || 'DH%20Kaduku%20Mango%20Pickle%20-%20400g.jpg'
    WHERE id = '34539413-4e5c-4c3f-a29c-19671afcc54b';

  UPDATE products SET image_url = base_url || 'dh%20lime%20pickle%20400g.jpg'
    WHERE id = 'c9f20cdb-b22e-4178-a3ec-197599142354';

  UPDATE products SET image_url = base_url || '777%20Mahani%20Pickle%20%28%20In%20Brine%29.jpg'
    WHERE id = '2f577da5-6df9-4f23-8e82-ee7f71f23083';

  UPDATE products SET image_url = base_url || 'APPAM%20IDIYAPPAM%20PATHIRI.jpg'
    WHERE id = 'b6c64897-d426-4dda-a757-032a52d97e03';

  UPDATE products SET image_url = base_url || '777%20Mango%20Ginger%20Pickle.jpg'
    WHERE id = '25cabbd6-beeb-4445-886c-4d447ec6784d';

  UPDATE products SET image_url = base_url || '777%20Mixed%20Pickle.jpg'
    WHERE id = '34a5326d-7c00-48dd-89d8-5ab3d710c54d';

  UPDATE products SET image_url = base_url || 'Sakthi%20Mutton%20Masala.jpg'
    WHERE id = '1f0770dc-6a96-43ba-87c3-3e2da355a4df';

  UPDATE products SET image_url = base_url || 'MAGGIE%20NOODLES%20single.jpg'
    WHERE id = '5ce73c95-d17a-460a-8cbb-fc8cec5e880e';

  UPDATE products SET image_url = base_url || 'pazham_chips.png'
    WHERE id = '1bb66445-7bd0-4927-ace1-bebe55fbd29b';

  UPDATE products SET image_url = base_url || 'TATA-SALT.png'
    WHERE id = 'f916f3e2-8230-4e17-8a5f-25ee9dc337b1';

  UPDATE products SET image_url = base_url || 'dh%20rasasm%20powder.jpg'
    WHERE id = '7e0eba6c-839a-4e47-b2e1-48efc49cbc6b';

  UPDATE products SET image_url = base_url || 'dh%20ribbon%20ad.jpg'
    WHERE id = 'd0e0d1c5-063a-41f8-b8fa-992e4bb2776a';

  UPDATE products SET image_url = base_url || 'Rice%20Flakes%20Red%20500G.jpg'
    WHERE id = '12dbc32a-5245-4c1c-8980-56d56fb93c99';

  UPDATE products SET image_url = base_url || 'rice%20palada%20payasam%20mmix.jpg'
    WHERE id = 'fb6c0f4e-48fc-44ae-a374-2029c7c1d57d';

  UPDATE products SET image_url = base_url || 'DH%20roasted%20white%20rice%20flour.jpg'
    WHERE id = '5fd86717-3e49-429d-a0ea-56bb7797cf3c';

  UPDATE products SET image_url = base_url || 'DH%20Roasted%20vermicelli%201kg.jpg'
    WHERE id = '0d8f4cca-127f-43dd-9996-0eae30f904c9';

  UPDATE products SET image_url = base_url || 'dh%20sambar%20masala.jpg'
    WHERE id = 'b982b8de-3cee-439c-ab6d-af297bf9d69a';

  UPDATE products SET image_url = base_url || 'dh%20sambar%20masala.jpg'
    WHERE id = '5a67042f-38a3-4818-82a1-377ad65f5c54';

  UPDATE products SET image_url = base_url || 'pickle.png'
    WHERE id = '3dc32878-bbd0-44e9-acd4-630a5e92cb14';

  UPDATE products SET image_url = base_url || 'sarkkara%20varatty.png'
    WHERE id = '935daed5-ce3c-4e25-92b6-d5b487c18d34';

  UPDATE products SET image_url = base_url || 'DH%20Semiya%20MIX.jpg'
    WHERE id = '5370919f-4116-4be3-b97b-9c8a3fcb7d28';

  UPDATE products SET image_url = base_url || 'SHALINI%20PONNI%20RAW%20RICE.png'
    WHERE id = '27e534b2-19d8-4b54-9a01-20d52638277e';

  UPDATE products SET image_url = base_url || 'dh%20soya%20chunks%20nano%20200g.jpg'
    WHERE id = '55ee104c-ab56-4f26-b041-7b36d7c39020';

  UPDATE products SET image_url = base_url || 'stae.png'
    WHERE id = '031f8daa-1396-4332-8b9b-2ff6ff1ef463';

  UPDATE products SET image_url = base_url || 'Kodumpuli%20200g.jpg'
    WHERE id = 'c5eed26f-ddf6-4211-a37e-1786ed5082f3';

  UPDATE products SET image_url = base_url || 'Tamarind%20Seedless%20200g.jpg'
    WHERE id = '838e3383-009e-472e-a8a9-93d861998610';

  UPDATE products SET image_url = base_url || 'THARAN-THANJAVOOR-PONNI-RAW-RICE.png'
    WHERE id = 'cff258de-5962-4294-a83b-685cfb94ad11';

  UPDATE products SET image_url = base_url || 'tappi_chips.png'
    WHERE id = '6438c01a-3fad-4bd1-9b60-a8053d260885';

  UPDATE products SET image_url = base_url || '777%20Tomato%20Pickle.jpg'
    WHERE id = 'c5fa80e2-388c-4fc8-bcde-572e5f065623';

  UPDATE products SET image_url = base_url || 'turmeric.png'
    WHERE id = 'da9010f0-0338-4de6-a544-b248657dc366';

  UPDATE products SET image_url = base_url || 'uzhunnu.png'
    WHERE id = 'ebddd3c8-4295-46bb-8406-740cbd37c48c';

  UPDATE products SET image_url = base_url || 'Lime-200g-Pickle-bottle-Black-2-SKU-13-01-17.jpg'
    WHERE id = 'f7a412e2-039b-40c1-8ea5-22c08d153a8b';

  UPDATE products SET image_url = base_url || 'Black%20Pepper%20200g.jpg'
    WHERE id = '8eeac925-cd5e-43f0-a228-ce5ad1171e6a';

  UPDATE products SET image_url = base_url || 'Instant%20Sadya%20Palada%20Mix.jpg'
    WHERE id = 'fb6c0f4e-48fc-44ae-a374-2029c7c1d57d';

END $$;
