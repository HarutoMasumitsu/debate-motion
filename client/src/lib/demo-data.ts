import type { Article, Category, PublicComment } from "./types";

export const HERO_IMAGE = "https://private-us-east-1.manuscdn.com/sessionFile/6ktXfBQxLgQRB8thPqQzUy/sandbox/GIwjT0q2nSgM1uM3UK9v7K-img-1_1772174090000_na1fn_aGVyby1kZWJhdGU.jpg?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvNmt0WGZCUXhMZ1FSQjh0aFBxUXpVeS9zYW5kYm94L0dJd2pUMHEyblNnTTF1TTNVSzl2N0staW1nLTFfMTc3MjE3NDA5MDAwMF9uYTFmbl9hR1Z5Ynkxa1pXSmhkR1UuanBnP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=abZpAyxxKERcxtf47Ct6BKuGZwjhpg09LNS2cjZKpKYeaM3Bkza-qrBymt9ebcj52kSqXkaJGhKapSxNzS5YLGvSTMy2PD1DxYnnVk5Ar8qhY6nYqkLaCjbXhGx39c8o9c7H0qJZ~AWMNAsOT15zNppJxgPc-jtwarxG8ghcyCMZQITQdNFzG6ydarsXFRNa1DM03ZNk~OH4~hf~iNLw3VL2iWZ3xby1eP5zJJUFROqPJnf1WtwWK-CwLGbY~fGqs2EMlXFsaDEq-b97sbV4ytiG8rEh5GonGDvKCc7UvuOW6YASLrk44XrooHWMCoNrlmqUbTOfZtEQMa1GAXHwZA__";

export const CATEGORY_IMAGES: Record<string, string> = {
  religion: "https://private-us-east-1.manuscdn.com/sessionFile/6ktXfBQxLgQRB8thPqQzUy/sandbox/GIwjT0q2nSgM1uM3UK9v7K-img-2_1772174078000_na1fn_Y2F0ZWdvcnktcmVsaWdpb24.jpg?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvNmt0WGZCUXhMZ1FSQjh0aFBxUXpVeS9zYW5kYm94L0dJd2pUMHEyblNnTTF1TTNVSzl2N0staW1nLTJfMTc3MjE3NDA3ODAwMF9uYTFmbl9ZMkYwWldkdmNua3RjbVZzYVdkcGIyNC5qcGc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=s~SVBx7dYbUBNJIM9CE~PuGmMg-1ywPZvsQqyC2s6X0-Hw79~khidfY-cZOB9o440X96oGY99CASL1XSsLBjb3r5hl9rZDWJ5QHrVdOr4Pkz9IdfmM5RhYGysTi4-p7N~CalZpklti2g3xFhPmUA~LbZXqCctoQ0kkaOpcQbEcId4ZfWGYB9V2~~zacKovz6mqBmv1WYV3V7eYkbiFv-LvNCN3u~jnZqd7NveAyjqd9I7gAi72sbj2rMQ6x4CMtrYSxoDGtMTCvtMTNVRa1nF1grBkVGvGMLhKEdObjuDiKuWGWYZzxvCTYtj1BhJRAkXNBNgSBeWN9qkO5362rUMg__",
  economy: "https://private-us-east-1.manuscdn.com/sessionFile/6ktXfBQxLgQRB8thPqQzUy/sandbox/GIwjT0q2nSgM1uM3UK9v7K-img-3_1772174092000_na1fn_Y2F0ZWdvcnktZWNvbm9teQ.jpg?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvNmt0WGZCUXhMZ1FSQjh0aFBxUXpVeS9zYW5kYm94L0dJd2pUMHEyblNnTTF1TTNVSzl2N0staW1nLTNfMTc3MjE3NDA5MjAwMF9uYTFmbl9ZMkYwWldkdmNua3RaV052Ym05dGVRLmpwZz94LW9zcy1wcm9jZXNzPWltYWdlL3Jlc2l6ZSx3XzE5MjAsaF8xOTIwL2Zvcm1hdCx3ZWJwL3F1YWxpdHkscV84MCIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=qYuiPZuvgKfgk1KgG~t160Tf9zjQr70OGrh6YFffQk~GLJRr5flE7hlqRMwCs4Kc~wuvmy6JkpzHFA5CNHQDKZ5ut4BZGK9qj1a9glkeUvEfZ7Lit4c66KyOzsdeTLC5s5Wm0aQk8UHWSfOz2SU6w54owWANXugdFHPxHIi-I7W8z0-wv3so7u4R4bTFvJbnAVysaLGCM7EV0Jq~Bccait5SCWq4nEeTGrno~4gcwL41~jDvdhgKH6IOVVadNwfd~hRHieyUNPSsByx73jk510kGb3SgP1k1yL7Jvd-3Y4QqqEZafjllzgjzuw1juTlugat4hdRPYYe81PAsXWUSlA__",
  choice: "https://private-us-east-1.manuscdn.com/sessionFile/6ktXfBQxLgQRB8thPqQzUy/sandbox/GIwjT0q2nSgM1uM3UK9v7K-img-4_1772174084000_na1fn_Y2F0ZWdvcnktY2hvaWNl.jpg?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvNmt0WGZCUXhMZ1FSQjh0aFBxUXpVeS9zYW5kYm94L0dJd2pUMHEyblNnTTF1TTNVSzl2N0staW1nLTRfMTc3MjE3NDA4NDAwMF9uYTFmbl9ZMkYwWldkdmNua3RZMmh2YVdObC5qcGc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=OTHOfW~fIXQsQO4JHYKwXpN9BrC0qRfnZl~u9VCp0no2wsqC2RTwSdFRk5qJVtbkpersNVeCcXeWis9QRxCl655fjKU0IupQIILVgWFKXiOZ3i9F~GupN3tJYwJTIulFZEOSxAZhPHf-tNId9YE1qtatoI1ohNU4JcWIsczAQqV-lQUz0rZeL6t73TVZYZ6NwdfVz6PJAMlIaAF7S4-iIVLf4xiu-4F3ot9Sbon4noq~Uh533gdrqhPG8jEEeyz1wntl0r9l3c1HFS7HM6z6o4I5J2Q8Ml0BVsgccCy86zxlBtPPRPooG34CrD248HIUH-PCgU25bBXKTqk~HoiAHw__",
};

export const DEMO_CATEGORIES: Category[] = [
  {
    id: "cat-1",
    name: "Religion",
    slug: "religion",
    description: "宗教・信仰に関するMotion",
    image_url: CATEGORY_IMAGES.religion,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "cat-2",
    name: "Economy",
    slug: "economy",
    description: "経済・財政に関するMotion",
    image_url: CATEGORY_IMAGES.economy,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "cat-3",
    name: "Choice",
    slug: "choice",
    description: "個人の選択・自由に関するMotion",
    image_url: CATEGORY_IMAGES.choice,
    created_at: "2025-01-01T00:00:00Z",
  },
];

export const DEMO_ARTICLES: Article[] = [
  {
    id: "art-1",
    title: "THW ban religious symbols in public schools",
    slug: "thw-ban-religious-symbols-in-public-schools",
    content: [
      {
        id: "b1",
        type: "heading",
        props: { level: 2 },
        content: [{ type: "text", text: "Motion概要" }],
      },
      {
        id: "b2",
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "このMotionは、公立学校における宗教的シンボル（ヒジャブ、十字架、キッパーなど）の着用を禁止すべきかどうかを問うものです。フランスのライシテ（政教分離）原則を背景に、世界各地のディベート大会で頻出するテーマです。",
          },
        ],
      },
      {
        id: "b3",
        type: "heading",
        props: { level: 2 },
        content: [{ type: "text", text: "Government側の主要論点" }],
      },
      {
        id: "b4",
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "政府側は、公教育の場における宗教的中立性の確保、少数派の生徒に対する同調圧力の排除、そして世俗的な公共空間の維持を主張します。特に、未成年者が自発的な選択として宗教的シンボルを着用しているのか、家庭や共同体からの圧力によるものかを区別することの困難さを強調します。",
          },
        ],
      },
      {
        id: "b5",
        type: "heading",
        props: { level: 2 },
        content: [{ type: "text", text: "Opposition側の主要論点" }],
      },
      {
        id: "b6",
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "反対側は、信教の自由と表現の自由という基本的人権の侵害を主張します。また、禁止措置が特定の宗教（特にイスラム教）を不均衡に標的にする差別的効果を持つこと、そして禁止が逆に宗教的マイノリティの教育機会を奪う可能性を指摘します。",
          },
        ],
      },
    ],
    excerpt:
      "公立学校における宗教的シンボルの着用禁止を問うMotion。ライシテ原則と信教の自由の対立を分析します。",
    thumbnail_url: CATEGORY_IMAGES.religion,
    category_id: "cat-1",
    author_id: "user-1",
    status: "published",
    likes_count: 24,
    created_at: "2025-02-15T10:00:00Z",
    updated_at: "2025-02-20T14:30:00Z",
    category: DEMO_CATEGORIES[0],
    author: {
      id: "user-1",
      email: "admin@example.com",
      display_name: "管理者",
      role: "admin",
      created_at: "2025-01-01T00:00:00Z",
    },
  },
  {
    id: "art-2",
    title: "THW implement Universal Basic Income",
    slug: "thw-implement-universal-basic-income",
    content: [
      {
        id: "b1",
        type: "heading",
        props: { level: 2 },
        content: [{ type: "text", text: "Motion概要" }],
      },
      {
        id: "b2",
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "ユニバーサル・ベーシック・インカム（UBI）は、すべての市民に無条件で一定額の現金を定期的に支給する制度です。このMotionでは、UBIの導入の是非を議論します。",
          },
        ],
      },
    ],
    excerpt:
      "ユニバーサル・ベーシック・インカムの導入を議論するMotion。労働インセンティブと社会保障の再設計を考察します。",
    thumbnail_url: CATEGORY_IMAGES.economy,
    category_id: "cat-2",
    author_id: "user-1",
    status: "published",
    likes_count: 18,
    created_at: "2025-02-10T08:00:00Z",
    updated_at: "2025-02-18T11:00:00Z",
    category: DEMO_CATEGORIES[1],
    author: {
      id: "user-1",
      email: "admin@example.com",
      display_name: "管理者",
      role: "admin",
      created_at: "2025-01-01T00:00:00Z",
    },
  },
  {
    id: "art-3",
    title: "THW allow the sale of human organs",
    slug: "thw-allow-the-sale-of-human-organs",
    content: [
      {
        id: "b1",
        type: "heading",
        props: { level: 2 },
        content: [{ type: "text", text: "Motion概要" }],
      },
      {
        id: "b2",
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "臓器売買の合法化は、個人の身体的自律性と市場原理の適用範囲を問う根本的な倫理的問題です。臓器不足による死亡者数の増加を背景に、規制された市場の創設を支持する議論が存在します。",
          },
        ],
      },
    ],
    excerpt:
      "臓器売買の合法化を問うMotion。身体的自律性と搾取のリスクの間で揺れる倫理的ジレンマを分析します。",
    thumbnail_url: CATEGORY_IMAGES.choice,
    category_id: "cat-3",
    author_id: "user-1",
    status: "published",
    likes_count: 31,
    created_at: "2025-02-05T12:00:00Z",
    updated_at: "2025-02-12T16:00:00Z",
    category: DEMO_CATEGORIES[2],
    author: {
      id: "user-1",
      email: "admin@example.com",
      display_name: "管理者",
      role: "admin",
      created_at: "2025-01-01T00:00:00Z",
    },
  },
  {
    id: "art-4",
    title: "THBT religious organizations should pay taxes",
    slug: "thbt-religious-organizations-should-pay-taxes",
    content: [],
    excerpt:
      "宗教団体への課税の是非を議論するMotion。政教分離と公平な税負担の観点から分析します。",
    thumbnail_url: CATEGORY_IMAGES.religion,
    category_id: "cat-1",
    author_id: "user-1",
    status: "published",
    likes_count: 12,
    created_at: "2025-01-28T09:00:00Z",
    updated_at: "2025-02-01T10:00:00Z",
    category: DEMO_CATEGORIES[0],
    author: {
      id: "user-1",
      email: "admin@example.com",
      display_name: "管理者",
      role: "admin",
      created_at: "2025-01-01T00:00:00Z",
    },
  },
  {
    id: "art-5",
    title: "THW abolish the minimum wage",
    slug: "thw-abolish-the-minimum-wage",
    content: [],
    excerpt:
      "最低賃金制度の廃止を議論するMotion。労働市場の自由化と労働者保護のバランスを考察します。",
    thumbnail_url: CATEGORY_IMAGES.economy,
    category_id: "cat-2",
    author_id: "user-1",
    status: "published",
    likes_count: 9,
    created_at: "2025-01-20T14:00:00Z",
    updated_at: "2025-01-25T08:00:00Z",
    category: DEMO_CATEGORIES[1],
    author: {
      id: "user-1",
      email: "admin@example.com",
      display_name: "管理者",
      role: "admin",
      created_at: "2025-01-01T00:00:00Z",
    },
  },
];

export const DEMO_COMMENTS: PublicComment[] = [
  {
    id: "com-1",
    article_id: "art-1",
    author_name: "ディベーター太郎",
    content:
      "とても分かりやすい解説でした。Gov側の論点整理が特に参考になりました。",
    created_at: "2025-02-21T10:00:00Z",
  },
  {
    id: "com-2",
    article_id: "art-1",
    author_name: "初心者ディベーター",
    content:
      "フランスのライシテについてもう少し詳しく知りたいです。参考文献はありますか？",
    created_at: "2025-02-22T15:30:00Z",
  },
];
