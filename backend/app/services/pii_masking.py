import logging
from presidio_analyzer import AnalyzerEngine, PatternRecognizer, Pattern
from presidio_anonymizer import AnonymizerEngine

logger = logging.getLogger(__name__)

class PIIMasker:
    """Singleton wrapper for Microsoft Presidio to mask PII in transcripts."""
    _instance = None
    _analyzer = None
    _anonymizer = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PIIMasker, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        logger.info("Initializing Microsoft Presidio PII engines...")
        try:
            # We use the en_core_web_lg model configured via spaCy
            self._analyzer = AnalyzerEngine()
            
            # Add a custom recognizer for simple dashed/dotted numbers like 555-1234
            phone_pattern = Pattern(name="phone_regex", regex=r"(\d{3}[-\.\s]??\d{4})", score=0.5)
            custom_phone_recognizer = PatternRecognizer(
                supported_entity="PHONE_NUMBER", 
                patterns=[phone_pattern]
            )
            self._analyzer.registry.add_recognizer(custom_phone_recognizer)
            
            self._anonymizer = AnonymizerEngine()
            logger.info("Presidio engines initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize Presidio: {e}")
            self._analyzer = None
            self._anonymizer = None

    def anonymize(self, text: str) -> str:
        """
        Detects and masks PII in the given text.
        Returns the originally formatted text if Presidio fails to initialize.
        """
        if not text or not text.strip():
            return text
            
        if self._analyzer is None or self._anonymizer is None:
            logger.warning("Presidio is not initialized, skipping PII masking.")
            return text

        try:
            # Analyze text for PII (PERSON, PHONE_NUMBER, EMAIL_ADDRESS, LOCATION, etc)
            results = self._analyzer.analyze(
                text=text, 
                language='en',
                return_decision_process=False
            )
            
            # Anonymize the detected PII
            anonymized_result = self._anonymizer.anonymize(
                text=text,
                analyzer_results=results
            )
            return anonymized_result.text
            
        except Exception as e:
            logger.error(f"Error during PII masking: {e}")
            # Fail gracefully by passing the untampered text, or you can choose to blank it out
            return text

# Global instance
masker = PIIMasker()

def anonymize_text(text: str) -> str:
    """Helper function to quickly mask text."""
    return masker.anonymize(text)
