import logging
from presidio_analyzer import AnalyzerEngine, PatternRecognizer, Pattern
from presidio_anonymizer import AnonymizerEngine

from typing import Tuple, Dict

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

    def anonymize(self, text: str) -> Tuple[str, Dict[str, str]]:
        """
        Detects and masks PII in the given text.
        Returns the originally formatted text and an empty mapping if Presidio fails to initialize.
        Returns the (masked_text, mapping_dict) tuple.
        """
        if not text or not text.strip():
            return text, {}
            
        if self._analyzer is None or self._anonymizer is None:
            logger.warning("Presidio is not initialized, skipping PII masking.")
            return text, {}

        try:
            # Analyze text for PII (PERSON, PHONE_NUMBER, EMAIL_ADDRESS, LOCATION, etc)
            results = self._analyzer.analyze(
                text=text, 
                language='en',
                return_decision_process=False
            )
            
            # Create a custom operator to assign unique IDs to each entity type
            mapping = {}
            counters = {}
            
            def generate_placeholder(entity_type: str, original_text: str) -> str:
                # Get current count for this entity type
                if entity_type not in counters:
                    counters[entity_type] = 0
                counters[entity_type] += 1
                
                # Format: <ENTITY_TYPE_ID> e.g., <PERSON_1>
                placeholder = f"<{entity_type}_{counters[entity_type]}>"
                mapping[placeholder] = original_text
                return placeholder
            
            # In order to intercept the anonymization correctly using custom logic we sort the
            # results from back to front, but first we MUST filter out overlapping entities
            # (e.g., URL and EMAIL_ADDRESS detected on the exact same text slice).
            
            filtered_results = []
            covered = set()
            # Sort by length (desc) then score (desc) to keep the biggest/best match
            for res in sorted(results, key=lambda x: ((x.end - x.start), x.score), reverse=True):
                res_set = set(range(res.start, res.end))
                # If no overlap with an already kept entity
                if not res_set.intersection(covered):
                    filtered_results.append(res)
                    covered.update(res_set)
            
            # Now we sort the filtered results from back to front for string replacement
            sorted_results = sorted(filtered_results, key=lambda x: x.start, reverse=True)
            
            masked_text = text
            for res in sorted_results:
                original_text = text[res.start:res.end]
                placeholder = generate_placeholder(res.entity_type, original_text)
                masked_text = masked_text[:res.start] + placeholder + masked_text[res.end:]
            
            return masked_text, mapping
            
        except Exception as e:
            logger.error(f"Error during PII masking: {e}")
            # Fail gracefully by passing the untampered text, or you can choose to blank it out
            return text, {}

# Global instance
masker = PIIMasker()

def anonymize_text(text: str) -> Tuple[str, Dict[str, str]]:
    """Helper function to quickly mask text. Returns (masked_text, mapping)."""
    return masker.anonymize(text)

def deanonymize_text(text: str, mapping: Dict[str, str]) -> str:
    """Helper function to restore original values using the mapping dictionary."""
    if not text or not mapping:
        return text
    
    restored_text = text
    # Replace each placeholder with the original text
    # (Doing this by straight string replace works best for JSON chunks)
    for placeholder, original_value in mapping.items():
        restored_text = restored_text.replace(placeholder, original_value)
        
    return restored_text
