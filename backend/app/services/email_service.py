import os
import logging
from typing import Optional, List
import resend
from app.core.config import settings
from app.core.supabase_client import supabase

logger = logging.getLogger("email_service")


def get_all_subscribers() -> List[str]:
    """Retrieve all verified subscriber emails from Supabase."""
    try:
        if not supabase:
            return []
        res = supabase.table("subscribers").select("email").execute()
        emails = [row["email"] for row in (res.data or []) if row.get("email")]
        return list(dict.fromkeys(emails))
    except Exception as e:
        logger.warning(f"Could not retrieve subscribers (table pending or offline): {e}")
        return []


def send_new_product_notification(
    artisan_name: str,
    product_title: str,
    image_url: str,
    product_id: str,
    price_inr: Optional[int] = None,
    artisan_id: Optional[str] = None,
):
    """
    Background Task: Dispatches an email notification to our subscriber community
    whenever an artisan publishes a new product.
    Isolate with try/except so email delivery errors never fail product creation.
    """
    try:
        api_key = settings.RESEND_API_KEY or os.getenv("RESEND_API_KEY")
        if not api_key:
            logger.info("Notice: RESEND_API_KEY not configured. Subscriber email simulated successfully.")
            return

        resend.api_key = api_key
        subscribers = get_all_subscribers()
        if not subscribers:
            logger.info("No subscribers found in database to notify.")
            return

        frontend_base = os.getenv("FRONTEND_URL", "https://vernacular-storefront.onrender.com").rstrip("/")
        storefront_url = f"{frontend_base}/shop/{artisan_id}" if artisan_id else f"{frontend_base}/shop"

        price_text = f"₹{price_inr:,}" if price_inr else "Exclusive Handloom"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F9F8F6; margin: 0; padding: 24px; color: #1C1917; }}
                .container {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #E7E5E4; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}
                .hero-img {{ width: 100%; max-height: 380px; object-fit: cover; display: block; }}
                .content {{ padding: 32px 28px; text-align: center; }}
                .badge {{ display: inline-block; padding: 6px 14px; background: #FEF3C7; color: #92400E; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; }}
                h1 {{ font-size: 24px; font-weight: 800; margin: 0 0 12px 0; color: #1C1917; line-height: 1.3; }}
                p {{ font-size: 14px; line-height: 1.6; color: #57534E; margin: 0 0 20px 0; }}
                .price-tag {{ font-size: 18px; font-weight: 700; color: #C85A32; margin-bottom: 24px; }}
                .btn {{ display: inline-block; padding: 14px 32px; background: #1C1917; color: #ffffff !important; text-decoration: none; border-radius: 9999px; font-weight: 700; font-size: 14px; }}
                .footer {{ border-top: 1px solid #F5F5F4; padding: 20px; text-align: center; font-size: 11px; color: #A8A29E; background: #FAFAF9; }}
            </style>
        </head>
        <body>
            <div class="container">
                <img src="{image_url}" alt="{product_title}" class="hero-img" />
                <div class="content">
                    <span class="badge">New Heritage Drop</span>
                    <h1>New Masterpiece Added!</h1>
                    <p><strong>{artisan_name}</strong> just posted a new creation: <em>"{product_title}"</em> on Vernacular AI.</p>
                    <div class="price-tag">{price_text}</div>
                    <a href="{storefront_url}" class="btn">View on Artisan Storefront &rarr;</a>
                </div>
                <div class="footer">
                    Crafted with love by Vernacular AI • Empowering India's Rural Weavers
                </div>
            </div>
        </body>
        </html>
        """

        # Batch send or BCC loop (Resend supports sending to up to 50 recipients per call in batch or BCC)
        for chunk in [subscribers[i:i + 45] for i in range(0, len(subscribers), 45)]:
            try:
                resend.Emails.send({
                    "from": settings.FROM_EMAIL,
                    "to": chunk[0],
                    "bcc": chunk[1:] if len(chunk) > 1 else [],
                    "subject": f"New Masterpiece Added! {artisan_name} posted '{product_title}'",
                    "html": html_content,
                })
            except Exception as batch_err:
                logger.warning(f"Error sending email chunk: {batch_err}")

        logger.info(f"Dispatched new product notifications to {len(subscribers)} subscribers.")
    except Exception as e:
        logger.error(f"Failed to send new product notification background task: {e}")


def send_back_in_stock_notification(
    artisan_name: str,
    product_title: str,
    image_url: str,
    product_id: str,
    price_inr: Optional[int] = None,
    artisan_id: Optional[str] = None,
):
    """
    Background Task: Dispatches an email notification when an out-of-stock item is restocked.
    """
    try:
        api_key = settings.RESEND_API_KEY or os.getenv("RESEND_API_KEY")
        if not api_key:
            logger.info("Notice: RESEND_API_KEY not configured. Back-in-stock email simulated successfully.")
            return

        resend.api_key = api_key
        subscribers = get_all_subscribers()
        if not subscribers:
            return

        frontend_base = os.getenv("FRONTEND_URL", "https://vernacular-storefront.onrender.com").rstrip("/")
        storefront_url = f"{frontend_base}/shop/{artisan_id}" if artisan_id else f"{frontend_base}/shop"
        price_text = f"₹{price_inr:,}" if price_inr else "Available Now"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F9F8F6; margin: 0; padding: 24px; color: #1C1917; }}
                .container {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #E7E5E4; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}
                .hero-img {{ width: 100%; max-height: 380px; object-fit: cover; display: block; }}
                .content {{ padding: 32px 28px; text-align: center; }}
                .badge {{ display: inline-block; padding: 6px 14px; background: #ECFDF5; color: #065F46; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; }}
                h1 {{ font-size: 24px; font-weight: 800; margin: 0 0 12px 0; color: #1C1917; }}
                p {{ font-size: 14px; line-height: 1.6; color: #57534E; margin: 0 0 20px 0; }}
                .price-tag {{ font-size: 18px; font-weight: 700; color: #047857; margin-bottom: 24px; }}
                .btn {{ display: inline-block; padding: 14px 32px; background: #065F46; color: #ffffff !important; text-decoration: none; border-radius: 9999px; font-weight: 700; font-size: 14px; }}
                .footer {{ border-top: 1px solid #F5F5F4; padding: 20px; text-align: center; font-size: 11px; color: #A8A29E; background: #FAFAF9; }}
            </style>
        </head>
        <body>
            <div class="container">
                <img src="{image_url}" alt="{product_title}" class="hero-img" />
                <div class="content">
                    <span class="badge">Back in Stock</span>
                    <h1>Heritage Creation Restocked!</h1>
                    <p>Good news! <strong>{artisan_name}</strong> just restocked <em>"{product_title}"</em> on Vernacular AI.</p>
                    <div class="price-tag">{price_text}</div>
                    <a href="{storefront_url}" class="btn">Claim Yours Before It Sells Out &rarr;</a>
                </div>
                <div class="footer">
                    Vernacular AI • Preserving Living Cultural Heritage
                </div>
            </div>
        </body>
        </html>
        """

        for chunk in [subscribers[i:i + 45] for i in range(0, len(subscribers), 45)]:
            try:
                resend.Emails.send({
                    "from": settings.FROM_EMAIL,
                    "to": chunk[0],
                    "bcc": chunk[1:] if len(chunk) > 1 else [],
                    "subject": f"Back in Stock! '{product_title}' by {artisan_name}",
                    "html": html_content,
                })
            except Exception as batch_err:
                logger.warning(f"Error sending restock email chunk: {batch_err}")

        logger.info(f"Dispatched back-in-stock notification to {len(subscribers)} subscribers.")
    except Exception as e:
        logger.error(f"Failed to send back-in-stock notification: {e}")


def send_artisan_tip_notification(
    artisan_id: str,
    artisan_name: str,
    amount: float,
    currency: str,
    payment_method: str,
    patron_name: Optional[str] = None,
):
    """
    Background Task: Dispatches an email notification to the Artisan when a patron sends/records a tip.
    Subject: 🎉 You received a new tip on Vernacular AI!
    Body: "Hello [Artisan Name], [Patron Name or 'An anonymous patron'] has just recorded a [Currency] [Amount] tip for you via [Payment Method (e.g., UPI)]. Please check your banking app to confirm receipt of the funds."
    Isolated with try/except so email delivery errors never fail the tip recording response.
    """
    try:
        api_key = settings.RESEND_API_KEY or os.getenv("RESEND_API_KEY")
        if not api_key:
            logger.info("Notice: RESEND_API_KEY not configured. Artisan tip notification simulated.")
            return

        resend.api_key = api_key

        # 1. Query the database to get the receiving Artisan's registered email address
        artisan_email = None

        # First attempt: Supabase Auth Admin API (where user signed up with Google or Email)
        try:
            auth_user = supabase.auth.admin.get_user_by_id(artisan_id)
            if auth_user and auth_user.user and auth_user.user.email:
                artisan_email = auth_user.user.email
        except Exception as auth_err:
            logger.warning(f"Notice querying auth.users for artisan {artisan_id}: {auth_err}")

        # Second attempt: check artisans table (paypal_email or email)
        if not artisan_email:
            try:
                res = supabase.table("artisans").select("*").eq("id", artisan_id).maybe_single().execute()
                if res and res.data:
                    artisan_email = res.data.get("paypal_email") or res.data.get("email")
            except Exception as db_err:
                logger.warning(f"Notice querying artisans table for email {artisan_id}: {db_err}")

        if not artisan_email:
            logger.info(f"No registered email found for artisan {artisan_id} ({artisan_name}). Skipping tip email.")
            return

        display_patron = (patron_name or "").strip() or "An anonymous patron"
        formatted_amount = f"₹{amount:,.2f}" if currency == "INR" else f"${amount:,.2f} USD"
        display_method = payment_method.upper() if payment_method else "UPI"

        frontend_base = os.getenv("FRONTEND_URL", "https://vernacular-storefront.onrender.com").rstrip("/")
        studio_url = f"{frontend_base}/studio"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F9F8F6; margin: 0; padding: 24px; color: #1C1917; }}
                .container {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #E7E5E4; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}
                .header-bar {{ background: linear-gradient(135deg, #D97706, #B45309); padding: 32px 24px; text-align: center; color: #ffffff; }}
                .header-emoji {{ font-size: 42px; margin-bottom: 8px; }}
                .header-bar h1 {{ margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; }}
                .content {{ padding: 32px 28px; }}
                .greeting {{ font-size: 16px; font-weight: 700; color: #1C1917; margin-bottom: 16px; }}
                .message-box {{ background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 16px; padding: 20px; margin: 24px 0; text-align: center; }}
                .tip-amount {{ font-size: 32px; font-weight: 900; color: #92400E; margin: 8px 0; }}
                .tip-details {{ font-size: 12px; color: #78350F; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }}
                .body-text {{ font-size: 14px; line-height: 1.6; color: #57534E; margin: 16px 0; }}
                .cta-wrapper {{ text-align: center; margin: 28px 0 12px 0; }}
                .btn {{ display: inline-block; padding: 14px 32px; background: #1C1917; color: #ffffff !important; text-decoration: none; border-radius: 9999px; font-weight: 700; font-size: 13px; }}
                .footer {{ border-top: 1px solid #F5F5F4; padding: 20px; text-align: center; font-size: 11px; color: #A8A29E; background: #FAFAF9; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header-bar">
                    <div class="header-emoji">🎉</div>
                    <h1>You Received a New Tip!</h1>
                </div>
                <div class="content">
                    <div class="greeting">Hello {artisan_name},</div>
                    <p class="body-text">
                        <strong>{display_patron}</strong> has just recorded a <strong>{currency} {formatted_amount}</strong> tip for you via <strong>{display_method}</strong>.
                    </p>
                    <div class="message-box">
                        <div class="tip-details">Direct Patronage Recorded</div>
                        <div class="tip-amount">{formatted_amount}</div>
                        <div class="tip-details">Via {display_method} • 100% Commission-Free</div>
                    </div>
                    <p class="body-text">
                        Please check your banking app to confirm receipt of the funds.
                    </p>
                    <div class="cta-wrapper">
                        <a href="{studio_url}" class="btn">View Live Studio Analytics &rarr;</a>
                    </div>
                </div>
                <div class="footer">
                    Vernacular AI • 100% Direct Weaver Platform & Global Digital Sovereignty
                </div>
            </div>
        </body>
        </html>
        """

        resend.Emails.send({
            "from": settings.FROM_EMAIL,
            "to": artisan_email,
            "subject": "🎉 You received a new tip on Vernacular AI!",
            "html": html_content,
        })
        logger.info(f"Dispatched tip notification email to artisan {artisan_name} ({artisan_email}).")
    except Exception as e:
        logger.warning(f"Artisan tip email dispatch notice: {e}")
