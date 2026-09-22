/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/loyalty.json`.
 */
export type Loyalty = {
  "address": "HWvvvwSEounpNXcbD4JUNmniB5YxTcFNYoAestzJJCuL",
  "metadata": {
    "name": "loyalty",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "cancelPresentation",
      "discriminator": [
        134,
        152,
        114,
        158,
        75,
        54,
        218,
        110
      ],
      "accounts": [
        {
          "name": "voucher"
        },
        {
          "name": "mint",
          "relations": [
            "voucher"
          ]
        },
        {
          "name": "holderToken",
          "writable": true
        },
        {
          "name": "owner",
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": []
    },
    {
      "name": "claimReceipt",
      "discriminator": [
        152,
        17,
        220,
        46,
        22,
        147,
        138,
        116
      ],
      "accounts": [
        {
          "name": "business",
          "writable": true
        },
        {
          "name": "receipt",
          "docs": [
            "Closed here. Its rent goes back to whoever paid for it, never to the",
            "business: the merchant didn't pay for it."
          ],
          "writable": true
        },
        {
          "name": "card",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "business"
              },
              {
                "kind": "account",
                "path": "customer"
              }
            ]
          }
        },
        {
          "name": "customer",
          "docs": [
            "The customer authorizing this claim. Signs to prove it's really them,",
            "but pays nothing — the relayer covers rent and fees instead."
          ],
          "signer": true
        },
        {
          "name": "relayer",
          "docs": [
            "The relayer, paying rent and fees on the customer's behalf so the",
            "customer never needs to hold SOL."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "rentPayer",
          "docs": [
            "The wallet that paid the receipt's rent, recorded in the receipt.",
            "Receives it back. Normally this is the relayer itself."
          ],
          "writable": true,
          "relations": [
            "receipt"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "secret",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "closeExpiredVoucher",
      "discriminator": [
        142,
        164,
        210,
        177,
        34,
        32,
        225,
        120
      ],
      "accounts": [
        {
          "name": "voucher",
          "writable": true
        },
        {
          "name": "mint",
          "writable": true,
          "relations": [
            "voucher"
          ]
        },
        {
          "name": "holderToken",
          "docs": [
            "(the holder may have burned it themselves). Checked in the handler: it",
            "must belong to this voucher's mint, and once this runs no token may be",
            "left anywhere."
          ],
          "writable": true
        },
        {
          "name": "rentPayer",
          "docs": [
            "The wallet that paid for the voucher, recorded in it. Receives the rent."
          ],
          "writable": true,
          "relations": [
            "voucher"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": []
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "counter",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  117,
                  110,
                  116,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "issueReceipt",
      "discriminator": [
        128,
        231,
        32,
        119,
        210,
        139,
        80,
        68
      ],
      "accounts": [
        {
          "name": "business",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  115,
                  105,
                  110,
                  101,
                  115,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "receipt",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  101,
                  105,
                  112,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "business"
              },
              {
                "kind": "arg",
                "path": "secretHash"
              }
            ]
          }
        },
        {
          "name": "authority",
          "docs": [
            "The merchant issuing this receipt. Signs to prove it's really them",
            "and to satisfy the has_one check above, but pays nothing."
          ],
          "signer": true,
          "relations": [
            "business"
          ]
        },
        {
          "name": "relayer",
          "docs": [
            "The relayer, covering the receipt account's rent on the merchant's",
            "behalf."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "secretHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "amountBand",
          "type": "u8"
        }
      ]
    },
    {
      "name": "mintCardNft",
      "discriminator": [
        234,
        240,
        66,
        205,
        104,
        91,
        164,
        223
      ],
      "accounts": [
        {
          "name": "business",
          "relations": [
            "card"
          ]
        },
        {
          "name": "card",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "business"
              },
              {
                "kind": "account",
                "path": "customer"
              }
            ]
          }
        },
        {
          "name": "mint",
          "docs": [
            "(the card and its current cycle), and the account is set up by hand",
            "because Anchor can't declare the \"can't be moved\" extension."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  114,
                  100,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "card"
              },
              {
                "kind": "account",
                "path": "card.nft_cycle",
                "account": "loyaltyCard"
              }
            ]
          }
        },
        {
          "name": "record",
          "docs": [
            "Records who paid for this NFT, so its rent goes back to exactly that",
            "wallet when the NFT is burned."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  114,
                  100,
                  95,
                  110,
                  102,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "customerToken",
          "docs": [
            "associated token program, which checks that this is the right address."
          ],
          "writable": true
        },
        {
          "name": "customer",
          "docs": [
            "The customer receiving the card NFT. Signs to authorize it, but pays",
            "nothing."
          ],
          "signer": true,
          "relations": [
            "card"
          ]
        },
        {
          "name": "relayer",
          "docs": [
            "The relayer, covering the rent for the mint and the token account."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "uri",
          "type": "string"
        }
      ]
    },
    {
      "name": "mintVoucher",
      "discriminator": [
        32,
        159,
        6,
        98,
        21,
        234,
        141,
        90
      ],
      "accounts": [
        {
          "name": "business",
          "writable": true
        },
        {
          "name": "card",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "business"
              },
              {
                "kind": "account",
                "path": "customer"
              }
            ]
          }
        },
        {
          "name": "voucher",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  117,
                  99,
                  104,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "business"
              },
              {
                "kind": "arg",
                "path": "voucherId"
              }
            ]
          }
        },
        {
          "name": "mint",
          "docs": [
            "The voucher's NFT. The voucher account is its mint authority, freeze",
            "authority, permanent delegate and close authority, so only this",
            "program can freeze, thaw, burn or close it. The metadata lives inside",
            "the mint account itself."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  117,
                  99,
                  104,
                  101,
                  114,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "business"
              },
              {
                "kind": "arg",
                "path": "voucherId"
              }
            ]
          }
        },
        {
          "name": "customerToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "customer"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "cardMint",
          "docs": [
            "here (by the card and its cycle); if nothing exists there the card has",
            "no NFT yet and this step is skipped."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  114,
                  100,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "card"
              },
              {
                "kind": "account",
                "path": "card.nft_cycle",
                "account": "loyaltyCard"
              }
            ]
          }
        },
        {
          "name": "cardToken",
          "docs": [
            "the customer's associated token account for that mint; it may be",
            "missing if there is no NFT or the customer already closed it."
          ],
          "writable": true
        },
        {
          "name": "cardNftRecord",
          "docs": [
            "by the NFT's mint; it may not exist (no NFT, or one made before records",
            "existed), which the handler checks."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  114,
                  100,
                  95,
                  110,
                  102,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "cardMint"
              }
            ]
          }
        },
        {
          "name": "cardRentPayer",
          "docs": [
            "be the wallet it names, which the handler checks."
          ],
          "writable": true
        },
        {
          "name": "customer",
          "docs": [
            "The customer converting their stamps into a voucher. Signs to",
            "authorize it, but pays nothing."
          ],
          "signer": true
        },
        {
          "name": "relayer",
          "docs": [
            "The relayer, covering the rent for the voucher, its mint and the",
            "customer's token account on the customer's behalf."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "voucherId",
          "type": "u64"
        },
        {
          "name": "uri",
          "type": "string"
        }
      ]
    },
    {
      "name": "presentVoucher",
      "discriminator": [
        198,
        184,
        64,
        14,
        80,
        42,
        57,
        31
      ],
      "accounts": [
        {
          "name": "voucher"
        },
        {
          "name": "mint",
          "relations": [
            "voucher"
          ]
        },
        {
          "name": "holderToken",
          "docs": [
            "The token account holding the voucher. The signer must own it, so",
            "only the real holder can present."
          ],
          "writable": true
        },
        {
          "name": "owner",
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": []
    },
    {
      "name": "reclaimExpiredReceipt",
      "discriminator": [
        86,
        115,
        43,
        238,
        151,
        14,
        142,
        204
      ],
      "accounts": [
        {
          "name": "receipt",
          "writable": true
        },
        {
          "name": "rentPayer",
          "docs": [
            "The wallet that paid the receipt's rent, recorded in the receipt.",
            "Receives it back — not the merchant, who never paid for it."
          ],
          "writable": true,
          "relations": [
            "receipt"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "redeemVoucher",
      "discriminator": [
        50,
        219,
        8,
        127,
        45,
        96,
        161,
        92
      ],
      "accounts": [
        {
          "name": "business",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  115,
                  105,
                  110,
                  101,
                  115,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          },
          "relations": [
            "voucher"
          ]
        },
        {
          "name": "voucher",
          "docs": [
            "Closed here. Its rent goes back to whoever paid for it, never to the",
            "merchant: the merchant didn't pay for it."
          ],
          "writable": true
        },
        {
          "name": "mint",
          "docs": [
            "Writable because burning lowers its supply, and because it is closed",
            "once it is empty."
          ],
          "writable": true,
          "relations": [
            "voucher"
          ]
        },
        {
          "name": "holderToken",
          "docs": [
            "Whoever holds the voucher right now. The merchant doesn't need to",
            "know the holder's address, only that this account is the one holding",
            "the voucher token and that it was presented (frozen)."
          ],
          "writable": true
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "business"
          ]
        },
        {
          "name": "relayer",
          "docs": [
            "Present purely as a required signer, matching every other",
            "relayer-backed instruction's structure — not used inside the",
            "handler itself, since redeeming doesn't create any account or need",
            "a payer."
          ],
          "signer": true
        },
        {
          "name": "rentPayer",
          "docs": [
            "The wallet that paid for the voucher, recorded in it. Receives back",
            "the rent of the voucher account, its NFT and the holder's token",
            "account. Normally this is the relayer itself."
          ],
          "writable": true,
          "relations": [
            "voucher"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": []
    },
    {
      "name": "registerBusiness",
      "discriminator": [
        73,
        228,
        5,
        59,
        229,
        67,
        133,
        82
      ],
      "accounts": [
        {
          "name": "business",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  115,
                  105,
                  110,
                  101,
                  115,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "authority",
          "docs": [
            "The merchant registering this business. Signs to prove it's really",
            "them — their identity is baked directly into the business's own",
            "address — but pays nothing."
          ],
          "signer": true
        },
        {
          "name": "relayer",
          "docs": [
            "The relayer, covering the business account's rent on the merchant's",
            "behalf."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "category",
          "type": "string"
        },
        {
          "name": "rewardLabel",
          "type": "string"
        },
        {
          "name": "stampsRequired",
          "type": "u8"
        },
        {
          "name": "minPurchaseAmount",
          "type": "u64"
        },
        {
          "name": "currency",
          "type": "string"
        },
        {
          "name": "receiptTtlSeconds",
          "type": "u32"
        }
      ]
    },
    {
      "name": "retireIdleCardNft",
      "discriminator": [
        77,
        244,
        46,
        194,
        9,
        6,
        229,
        49
      ],
      "accounts": [
        {
          "name": "card",
          "writable": true
        },
        {
          "name": "customer",
          "docs": [
            "never signs, and must be the customer the card names."
          ],
          "relations": [
            "card"
          ]
        },
        {
          "name": "cardMint",
          "docs": [
            "cycle, and its record (below) only exists if the NFT does."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  114,
                  100,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "card"
              },
              {
                "kind": "account",
                "path": "card.nft_cycle",
                "account": "loyaltyCard"
              }
            ]
          }
        },
        {
          "name": "cardToken",
          "writable": true
        },
        {
          "name": "record",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  114,
                  100,
                  95,
                  110,
                  102,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "cardMint"
              }
            ]
          }
        },
        {
          "name": "rentPayer",
          "docs": [
            "The wallet that paid for the NFT, recorded in its record. Receives the",
            "rent."
          ],
          "writable": true,
          "relations": [
            "record"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": []
    },
    {
      "name": "transferVoucher",
      "discriminator": [
        242,
        112,
        216,
        16,
        30,
        33,
        89,
        14
      ],
      "accounts": [
        {
          "name": "voucher",
          "writable": true
        },
        {
          "name": "mint",
          "relations": [
            "voucher"
          ]
        },
        {
          "name": "fromToken",
          "docs": [
            "A frozen account (a voucher presented to a merchant) can't be",
            "transferred. The token program refuses it as well, this just gives a",
            "clearer error."
          ],
          "writable": true
        },
        {
          "name": "toToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "newOwner"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "newOwner",
          "docs": [
            "account. It never has to sign."
          ]
        },
        {
          "name": "owner",
          "docs": [
            "The current holder, signing to send the voucher away."
          ],
          "signer": true
        },
        {
          "name": "relayer",
          "docs": [
            "The relayer, covering the rent for the receiving token account if it",
            "doesn't exist yet."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "rentPayer",
          "docs": [
            "The wallet that paid for the voucher, recorded in it. Receives back",
            "the rent of the sender's token account, which is empty once the",
            "voucher has moved. Normally this is the relayer itself."
          ],
          "writable": true,
          "relations": [
            "voucher"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "updateBusinessConfig",
      "discriminator": [
        90,
        55,
        166,
        153,
        161,
        163,
        51,
        244
      ],
      "accounts": [
        {
          "name": "business",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  115,
                  105,
                  110,
                  101,
                  115,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "business"
          ]
        }
      ],
      "args": [
        {
          "name": "rewardLabel",
          "type": "string"
        },
        {
          "name": "stampsRequired",
          "type": "u8"
        },
        {
          "name": "minPurchaseAmount",
          "type": "u64"
        },
        {
          "name": "receiptTtlSeconds",
          "type": "u32"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "business",
      "discriminator": [
        60,
        203,
        129,
        133,
        68,
        183,
        210,
        177
      ]
    },
    {
      "name": "cardNft",
      "discriminator": [
        234,
        102,
        146,
        79,
        206,
        88,
        37,
        62
      ]
    },
    {
      "name": "counter",
      "discriminator": [
        255,
        176,
        4,
        245,
        188,
        253,
        124,
        25
      ]
    },
    {
      "name": "loyaltyCard",
      "discriminator": [
        204,
        41,
        42,
        207,
        153,
        71,
        5,
        60
      ]
    },
    {
      "name": "receipt",
      "discriminator": [
        39,
        154,
        73,
        106,
        80,
        102,
        145,
        153
      ]
    },
    {
      "name": "voucher",
      "discriminator": [
        191,
        204,
        149,
        234,
        213,
        165,
        13,
        65
      ]
    }
  ],
  "events": [
    {
      "name": "stampClaimed",
      "discriminator": [
        193,
        46,
        68,
        42,
        91,
        202,
        167,
        59
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "customError",
      "msg": "Custom error message"
    },
    {
      "code": 6001,
      "name": "invalidAmountBand",
      "msg": "The purchase amount must meet the business's minimum threshold"
    },
    {
      "code": 6002,
      "name": "receiptExpired",
      "msg": "This receipt has expired"
    },
    {
      "code": 6003,
      "name": "invalidSecret",
      "msg": "The provided secret does not match this receipt"
    },
    {
      "code": 6004,
      "name": "invalidVoucherId",
      "msg": "This voucher ID does not match the business's next expected ID"
    },
    {
      "code": 6005,
      "name": "notEnoughStamps",
      "msg": "Not enough stamps to mint a voucher"
    },
    {
      "code": 6006,
      "name": "voucherPending",
      "msg": "This voucher is currently presented for redemption"
    },
    {
      "code": 6007,
      "name": "voucherNotPresented",
      "msg": "This voucher has not been presented for redemption"
    },
    {
      "code": 6008,
      "name": "receiptNotYetExpired",
      "msg": "This receipt has not yet expired"
    },
    {
      "code": 6009,
      "name": "stampCooldownActive",
      "msg": "Please wait before claiming another stamp on this card"
    },
    {
      "code": 6010,
      "name": "receiptRateLimitExceeded",
      "msg": "This business has issued too many receipts in the last hour"
    },
    {
      "code": 6011,
      "name": "claimRateLimitExceeded",
      "msg": "This card has claimed too many stamps today"
    },
    {
      "code": 6012,
      "name": "uriTooLong",
      "msg": "The voucher metadata URI is too long"
    },
    {
      "code": 6013,
      "name": "notVoucherHolder",
      "msg": "This token account does not hold the voucher"
    },
    {
      "code": 6014,
      "name": "voucherExpired",
      "msg": "This voucher has expired"
    },
    {
      "code": 6015,
      "name": "voucherNotExpired",
      "msg": "This voucher has not expired yet"
    },
    {
      "code": 6016,
      "name": "cardNftNotIdle",
      "msg": "This card has had a stamp in the last 90 days"
    },
    {
      "code": 6017,
      "name": "wrongRentPayer",
      "msg": "The rent must go back to the wallet that paid it"
    }
  ],
  "types": [
    {
      "name": "business",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "category",
            "type": "string"
          },
          {
            "name": "rewardLabel",
            "type": "string"
          },
          {
            "name": "stampsRequired",
            "type": "u8"
          },
          {
            "name": "minPurchaseAmount",
            "type": "u64"
          },
          {
            "name": "currency",
            "type": "string"
          },
          {
            "name": "receiptTtlSeconds",
            "type": "u32"
          },
          {
            "name": "receiptsWindowStart",
            "type": "i64"
          },
          {
            "name": "receiptsThisWindow",
            "type": "u32"
          },
          {
            "name": "totalCards",
            "type": "u32"
          },
          {
            "name": "totalStampsIssued",
            "type": "u64"
          },
          {
            "name": "totalVouchersIssued",
            "type": "u64"
          },
          {
            "name": "totalRedemptions",
            "type": "u32"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "cardNft",
      "docs": [
        "Who paid for a card NFT (its mint, the customer's token account and this",
        "record), so that rent goes back to exactly that wallet when the NFT is",
        "burned: at cash-in, or once the card has gone 90 days without a stamp.",
        "Lives at `[\"card_nft\", mint]` and is closed together with the NFT."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "rentPayer",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "counter",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "count",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "loyaltyCard",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "business",
            "type": "pubkey"
          },
          {
            "name": "customer",
            "type": "pubkey"
          },
          {
            "name": "stamps",
            "type": "u8"
          },
          {
            "name": "lastStampTs",
            "type": "i64"
          },
          {
            "name": "claimsWindowStart",
            "type": "i64"
          },
          {
            "name": "claimsThisWindow",
            "type": "u32"
          },
          {
            "name": "lifetimeStamps",
            "type": "u32"
          },
          {
            "name": "nftCycle",
            "docs": [
              "Which card NFT is the current one. Part of the NFT's mint address, so a",
              "fresh NFT gets a fresh address each time the last one is burned. This",
              "used to be `redemptions` (unused since vouchers became NFTs); the size",
              "is the same, so cards that already exist keep working."
            ],
            "type": "u32"
          },
          {
            "name": "stampsRequiredSnapshot",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "receipt",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "business",
            "type": "pubkey"
          },
          {
            "name": "amountBand",
            "type": "u8"
          },
          {
            "name": "issuedAt",
            "type": "i64"
          },
          {
            "name": "expiresAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "rentPayer",
            "docs": [
              "Whoever paid this receipt's rent (the relayer, when the app issues",
              "it). The rent goes back to exactly this wallet when the receipt is",
              "claimed or reclaimed, so nobody else can collect it."
            ],
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "stampClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "business",
            "type": "pubkey"
          },
          {
            "name": "customer",
            "type": "pubkey"
          },
          {
            "name": "stamps",
            "type": "u8"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "voucher",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "business",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "docs": [
              "The wallet that last received this voucher through `transfer_voucher`.",
              "Only a hint so the app can list a customer's vouchers. A wallet can",
              "move the NFT without telling us, so this can go stale. Never use it",
              "for permission checks: the token account is the source of truth."
            ],
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "voucherId",
            "type": "u64"
          },
          {
            "name": "mintedAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "rentPayer",
            "docs": [
              "Whoever paid the rent for this voucher, its NFT and the first holder's",
              "token account (the relayer, when the app mints it). All of that rent",
              "goes back to exactly this wallet when the voucher is redeemed."
            ],
            "type": "pubkey"
          },
          {
            "name": "expiresAt",
            "docs": [
              "When the voucher stops being usable (90 days after minting). After",
              "this it can't be presented, gifted or redeemed, and anyone can close",
              "it so its rent goes back to `rent_payer`."
            ],
            "type": "i64"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "seed",
      "type": "string",
      "value": "\"anchor\""
    }
  ]
};
