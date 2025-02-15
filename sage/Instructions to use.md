<!-- Create your venv -->
python3 -m venv venv
source venv/bin/activate

<!-- Install the packages -->
pip install -r requirements.txt

<!-- Run the app -->
python app.py

<!-- The APIs -->

<!-- 1. For Document Upload -->
http://127.0.0.1:5001/upload
Content-Type: multipart/form-data
file: File (PDF)

Response => {
  "message": "Stored 12 chunks from document.pdf"
}

<!-- 2. For Document Search -->
http://127.0.0.1:5001/search
Content-Type: application/json
{
  "query": "What does my insurance cover?"
}

Response => {
  "query": "What does my insurance cover?",
  "results": [
    "Your insurance policy covers medical emergencies, hospitalization, and preventive care.",
    "Coverage may vary depending on your plan type (HMO, PPO, etc.)."
  ]
}

